import type { FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyInstance } from 'fastify'
import { analyzeRequestSchema, saveKeywordSchema, listQuerySchema } from './schemas.js'
import { analyzeKeywords } from './service.js'
import {
  saveKeyword,
  listKeywords,
  getKeywordById,
  archiveKeyword,
  getKeywordDailyStats,
} from './repository.js'
import { createKeywordAdapter } from '../../adapters/keyword-adapter-factory.js'

const adapter = createKeywordAdapter()

export function buildHandlers(fastify: FastifyInstance) {
  return {
    async analyze(request: FastifyRequest, reply: FastifyReply) {
      const body = analyzeRequestSchema.parse(request.body)
      const results = await analyzeKeywords(body.keywords, adapter)
      return reply.send({ results })
    },

    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = listQuerySchema.parse(request.query)
      const { keywords, total } = await listKeywords(fastify.db, request.seller.sellerId, query)
      return reply.send({
        keywords,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      })
    },

    async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const keyword = await getKeywordById(fastify.db, request.params.id)
      return reply.send(keyword)
    },

    async save(request: FastifyRequest, reply: FastifyReply) {
      const body = saveKeywordSchema.parse(request.body)
      const keyword = await saveKeyword(fastify.db, request.seller.sellerId, body)
      return reply.status(201).send(keyword)
    },

    async archive(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      await archiveKeyword(fastify.db, request.params.id)
      return reply.status(204).send()
    },

    async getTrend(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
      const stats = await getKeywordDailyStats(fastify.db, request.params.id)
      return reply.send({ stats })
    },
  }
}
