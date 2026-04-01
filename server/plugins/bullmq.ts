import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { addJob, getQueueStats, cleanupOldJobs } from '../lib/queue.js'
import type { Pool } from 'pg'

// 큐 이름 상수
export const QUEUE_NAMES = {
  wholesaleCrawl: 'wholesale-crawl',
  aiProcess: 'ai-process',
  marketPublish: 'market-publish',
  inventorySync: 'inventory-sync',
  orderCollect: 'order-collect',
} as const

export type QueueName = keyof typeof QUEUE_NAMES

export interface JobQueueFunctions {
  addJob: (queueName: string, jobName: string, data: Record<string, unknown>) => Promise<string>
  getQueueStats: (queueName: string) => ReturnType<typeof getQueueStats>
}

declare module 'fastify' {
  interface FastifyInstance {
    jobQueue: JobQueueFunctions
  }
}

const jobQueuePlugin: FastifyPluginAsync = async (app) => {
  const db: Pool = app.db

  const jobQueueFns: JobQueueFunctions = {
    addJob: (queueName, jobName, data) => addJob(db, queueName, jobName, data),
    getQueueStats: (queueName) => getQueueStats(db, queueName),
  }

  app.decorate('jobQueue', jobQueueFns)

  // 오래된 완료/실패 작업 정리 (1시간 간격)
  const cleanupInterval = setInterval(async () => {
    try {
      for (const queueName of Object.values(QUEUE_NAMES)) {
        await cleanupOldJobs(db, queueName)
      }
    } catch {
      // 정리 실패는 무시
    }
  }, 60 * 60 * 1000)

  app.addHook('onClose', async () => {
    clearInterval(cleanupInterval)
    app.log.info('Job queue 플러그인 종료')
  })

  app.log.info('PostgreSQL Job Queue 초기화 완료 (5개: wholesale-crawl, ai-process, market-publish, inventory-sync, order-collect)')
}

export default fp(jobQueuePlugin, { name: 'jobQueue', dependencies: ['database'] })
