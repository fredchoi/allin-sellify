import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function dashboardModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  fastify.get('/kpi', h.kpi)
}
