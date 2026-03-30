import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function leadsModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.post('/', h.create)
  fastify.get('/stats', h.stats)
}
