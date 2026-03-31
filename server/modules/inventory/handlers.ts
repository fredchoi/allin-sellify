import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { listInventorySchema, updateTierSchema } from './schemas.js'
import {
  listInventoryJobs,
  getInventoryJobById,
  updateInventoryTier,
  getInventoryHistory,
} from './repository.js'
import { schedulePollJobs } from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  const db = fastify.db

  return {
    list: async (req: FastifyRequest, reply: FastifyReply) => {
      const query = listInventorySchema.parse(req.query)
      const result = await listInventoryJobs(db, query)
      reply.send(result)
    },

    getById: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const job = await getInventoryJobById(db, req.params.id)
      reply.send(job)
    },

    updateTier: async (
      req: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
      reply: FastifyReply
    ) => {
      const data = updateTierSchema.parse(req.body)
      const job = await updateInventoryTier(db, req.params.id, data)
      reply.send(job)
    },

    getHistory: async (
      req: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: string } }>,
      reply: FastifyReply
    ) => {
      const job = await getInventoryJobById(db, req.params.id)
      const limit = parseInt(req.query.limit ?? '50')
      const history = await getInventoryHistory(db, job.wholesale_product_id, limit)
      reply.send(history)
    },

    triggerSync: async (_req: FastifyRequest, reply: FastifyReply) => {
      const queued = await schedulePollJobs(db, fastify.inventoryQueue)
      reply.send({ queued, message: `${queued}개 재고 폴링 작업을 큐에 추가했습니다.` })
    },

    syncStatus: async (_req: FastifyRequest, reply: FastifyReply) => {
      const [waiting, active, completed, failed] = await Promise.all([
        fastify.inventoryQueue.getWaitingCount(),
        fastify.inventoryQueue.getActiveCount(),
        fastify.inventoryQueue.getCompletedCount(),
        fastify.inventoryQueue.getFailedCount(),
      ])
      reply.send({ waiting, active, completed, failed })
    },
  }
}
