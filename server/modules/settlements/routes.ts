import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function settlementsModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.get('/', h.list)
  fastify.get('/:id', h.getById)
  fastify.post('/calculate', h.calculate)

  fastify.get('/fee-rules', h.listFeeRules)
  fastify.post('/fee-rules', h.createFeeRule)
}
