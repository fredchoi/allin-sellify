import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function ordersModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.get('/', h.list)
  fastify.get('/stats', h.stats)
  fastify.get('/:id', h.getById)
  fastify.patch('/:id/status', h.updateStatus)
  fastify.post('/:id/tracking', h.createTracking)
  fastify.post('/mock-collect', h.mockCollect)
}
