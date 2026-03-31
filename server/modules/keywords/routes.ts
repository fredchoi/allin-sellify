import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function keywordsModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)
  const auth = { preHandler: [fastify.authenticate] }

  fastify.post('/analyze', auth, h.analyze)
  fastify.get('/', auth, h.list)
  fastify.post('/', auth, h.save)
  fastify.get<{ Params: { id: string } }>('/:id', auth, h.getById)
  fastify.delete<{ Params: { id: string } }>('/:id', auth, h.archive)
  fastify.get<{ Params: { id: string } }>('/:id/trend', auth, h.getTrend)
}
