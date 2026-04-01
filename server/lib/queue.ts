import type { Pool } from 'pg'

export interface JobOptions {
  maxAttempts?: number
  runAt?: Date
}

export interface JobRow {
  id: string
  queue_name: string
  job_name: string
  data: Record<string, unknown>
  status: string
  attempts: number
  max_attempts: number
  last_error: string | null
  run_at: Date
  started_at: Date | null
  completed_at: Date | null
  created_at: Date
}

/**
 * job_queue 테이블에 새 작업을 추가합니다.
 */
export async function addJob(
  db: Pool,
  queueName: string,
  jobName: string,
  data: Record<string, unknown>,
  opts?: JobOptions,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO job_queue (queue_name, job_name, data, max_attempts, run_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      queueName,
      jobName,
      JSON.stringify(data),
      opts?.maxAttempts ?? 3,
      opts?.runAt ?? new Date(),
    ],
  )
  return rows[0].id
}

/**
 * SELECT FOR UPDATE SKIP LOCKED 패턴으로 대기 중인 작업을 가져옵니다.
 * 트랜잭션 내에서 사용해야 합니다.
 */
export async function claimJob(
  db: Pool,
  queueName: string,
): Promise<JobRow | null> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const { rows } = await client.query<JobRow>(
      `SELECT * FROM job_queue
       WHERE queue_name = $1
         AND status = 'pending'
         AND run_at <= NOW()
         AND attempts < max_attempts
       ORDER BY run_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [queueName],
    )

    if (rows.length === 0) {
      await client.query('COMMIT')
      return null
    }

    const job = rows[0]

    await client.query(
      `UPDATE job_queue
       SET status = 'processing', started_at = NOW(), attempts = attempts + 1
       WHERE id = $1`,
      [job.id],
    )

    await client.query('COMMIT')
    return { ...job, status: 'processing', attempts: job.attempts + 1 }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * 작업 완료 처리
 */
export async function completeJob(db: Pool, jobId: string): Promise<void> {
  await db.query(
    `UPDATE job_queue
     SET status = 'completed', completed_at = NOW()
     WHERE id = $1`,
    [jobId],
  )
}

/**
 * 작업 실패 처리 — attempts < max_attempts이면 pending으로 되돌려 재시도
 */
export async function failJob(db: Pool, jobId: string, error: string): Promise<void> {
  await db.query(
    `UPDATE job_queue
     SET status = CASE
       WHEN attempts < max_attempts THEN 'pending'
       ELSE 'failed'
     END,
     last_error = $2,
     run_at = CASE
       WHEN attempts < max_attempts THEN NOW() + (POWER(2, attempts) || ' seconds')::INTERVAL
       ELSE run_at
     END
     WHERE id = $1`,
    [jobId, error],
  )
}

/**
 * 큐별 작업 수 통계
 */
export async function getQueueStats(
  db: Pool,
  queueName: string,
): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
  const { rows } = await db.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::TEXT as count
     FROM job_queue
     WHERE queue_name = $1
     GROUP BY status`,
    [queueName],
  )

  const stats = { pending: 0, processing: 0, completed: 0, failed: 0 }
  for (const row of rows) {
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = parseInt(row.count, 10)
    }
  }
  return stats
}

/**
 * 완료/실패된 오래된 작업 정리 (retention)
 */
export async function cleanupOldJobs(
  db: Pool,
  queueName: string,
  retentionDays = 7,
): Promise<number> {
  const { rowCount } = await db.query(
    `DELETE FROM job_queue
     WHERE queue_name = $1
       AND status IN ('completed', 'failed')
       AND completed_at < NOW() - ($2 || ' days')::INTERVAL`,
    [queueName, retentionDays],
  )
  return rowCount ?? 0
}

// ── Distributed Locks (replaces Redis NX locks) ────────────────────

/**
 * INSERT ... ON CONFLICT DO NOTHING + 만료 확인으로 분산 락을 획득합니다.
 */
export async function acquireLock(
  db: Pool,
  key: string,
  ttlSeconds = 60,
): Promise<boolean> {
  // 만료된 락을 먼저 정리
  await db.query(
    `DELETE FROM distributed_locks WHERE lock_key = $1 AND expires_at < NOW()`,
    [key],
  )

  const { rowCount } = await db.query(
    `INSERT INTO distributed_locks (lock_key, locked_at, expires_at)
     VALUES ($1, NOW(), NOW() + ($2 || ' seconds')::INTERVAL)
     ON CONFLICT (lock_key) DO NOTHING`,
    [key, ttlSeconds],
  )

  return (rowCount ?? 0) > 0
}

/**
 * 분산 락을 해제합니다.
 */
export async function releaseLock(db: Pool, key: string): Promise<void> {
  await db.query(
    `DELETE FROM distributed_locks WHERE lock_key = $1`,
    [key],
  )
}

// ── Job Processor (polling loop) ────────────────────────────────────

export type JobProcessor = (job: JobRow) => Promise<void>

export interface ProcessorOptions {
  pollIntervalMs?: number
  concurrency?: number
}

/**
 * setInterval 기반 폴링 워커를 시작합니다.
 * 반환된 cleanup 함수로 워커를 중지할 수 있습니다.
 */
export function startJobProcessor(
  db: Pool,
  queueName: string,
  processor: JobProcessor,
  opts?: ProcessorOptions,
): { stop: () => void } {
  const pollInterval = opts?.pollIntervalMs ?? 10_000
  let running = true

  async function poll() {
    if (!running) return

    try {
      const job = await claimJob(db, queueName)
      if (!job) return

      try {
        await processor(job)
        await completeJob(db, job.id)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        await failJob(db, job.id, msg)
      }
    } catch (err) {
      // claimJob 자체 실패 (DB 연결 문제 등) — 로그만 남기고 계속
      console.error(`[job-processor:${queueName}] poll error:`, err)
    }
  }

  const interval = setInterval(poll, pollInterval)

  return {
    stop: () => {
      running = false
      clearInterval(interval)
    },
  }
}
