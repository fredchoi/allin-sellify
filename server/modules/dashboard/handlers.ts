import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getKpiSummary } from './repository.js'

const kpiQuerySchema = z.object({
  sellerId: z.string().uuid(),
})

export function buildHandlers(fastify: FastifyInstance) {
  const db = fastify.db

  return {
    kpi: async (req: FastifyRequest, reply: FastifyReply) => {
      const { sellerId } = kpiQuerySchema.parse(req.query)
      const summary = await getKpiSummary(db, sellerId)
      reply.send(summary)
    },
  }
}
