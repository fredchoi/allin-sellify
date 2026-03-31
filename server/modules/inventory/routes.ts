import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function inventoryModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.get('/', h.list)
  fastify.get('/sync/status', h.syncStatus)
  fastify.post('/sync/trigger', h.triggerSync)
  fastify.get('/:id', h.getById)
  fastify.patch('/:id/tier', h.updateTier)
  fastify.get('/:id/history', h.getHistory)
}
