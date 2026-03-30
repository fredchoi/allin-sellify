import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function keywordsModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.post('/analyze', h.analyze)
  fastify.get('/', h.list)
  fastify.post('/', h.save)
  fastify.get('/:id', h.getById)
  fastify.delete('/:id', h.archive)
  fastify.get('/:id/trend', h.getTrend)
}
