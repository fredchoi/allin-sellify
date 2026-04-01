// Queue name constants (previously BullMQ Queue instances, now simple strings)
// Actual job queue operations use server/lib/queue.ts functions

export const QUEUE_NAMES = {
  wholesaleCrawl: 'wholesale-crawl',
  aiProcess: 'ai-process',
  marketPublish: 'market-publish',
  inventorySync: 'inventory-sync',
  orderCollect: 'order-collect',
} as const

export type QueueName = keyof typeof QUEUE_NAMES
