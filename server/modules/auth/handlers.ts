import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { loginSchema, refreshSchema, logoutSchema } from './schemas.js'
import { loginSeller, refreshAccessToken, logoutSeller } from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  return {
    async login(request: FastifyRequest, reply: FastifyReply) {
      const input = loginSchema.parse(request.body)
      const result = await loginSeller(fastify.db, fastify, input)
      return reply.status(200).send(result)
    },

    async refresh(request: FastifyRequest, reply: FastifyReply) {
      const input = refreshSchema.parse(request.body)
      const result = await refreshAccessToken(fastify.db, fastify, input)
      return reply.status(200).send(result)
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      const input = logoutSchema.parse(request.body)
      await logoutSeller(fastify.db, input)
      return reply.status(204).send()
    },
  }
}
