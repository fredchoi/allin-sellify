import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function authModule(fastify: FastifyInstance) {
  const handlers = buildHandlers(fastify)

  fastify.post('/register', handlers.register)
  fastify.post('/login', handlers.login)
  fastify.post('/refresh', handlers.refresh)
  fastify.post('/logout', handlers.logout)
}
