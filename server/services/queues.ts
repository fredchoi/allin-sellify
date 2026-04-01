import { Queue, QueueOptions } from 'bullmq'
import { config } from '../config.js'

const connection: QueueOptions['connection'] = {
  url: config.REDIS_URL,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  lazyConnect: true,
}

export const queues = {
  wholesaleCrawl: new Queue('wholesale-crawl', { connection }),
  aiProcess: new Queue('ai-process', { connection }),
  marketPublish: new Queue('market-publish', { connection }),
  inventorySync: new Queue('inventory-sync', { connection }),
  orderCollect: new Queue('order-collect', { connection }),
} as const

export type QueueName = keyof typeof queues
