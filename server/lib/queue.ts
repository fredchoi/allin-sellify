import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq'
import { config } from '../config.js'

type Processor<T = unknown, R = unknown> = (job: Job<T, R>, token?: string) => Promise<R>

const redisConnection: QueueOptions['connection'] = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: null,
}

/**
 * BullMQ 큐 팩토리
 * 공통 Redis 연결 설정으로 큐를 생성합니다.
 */
export function createQueue<T = unknown>(name: string, opts?: Omit<QueueOptions, 'connection'>): Queue<T> {
  return new Queue<T>(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
    ...opts,
  })
}

/**
 * BullMQ 워커 팩토리
 * 공통 Redis 연결 설정으로 워커를 생성합니다.
 */
export function createWorker<T = unknown, R = unknown>(
  name: string,
  processor: Processor<T, R>,
  opts?: Omit<WorkerOptions, 'connection'>,
): Worker<T, R> {
  return new Worker<T, R>(name, processor, {
    connection: redisConnection,
    concurrency: 5,
    ...opts,
  })
}

export { redisConnection }
