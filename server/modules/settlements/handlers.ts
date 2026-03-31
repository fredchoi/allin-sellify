import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import {
  listSettlementsSchema,
  calculateSettlementSchema,
  listFeeRulesSchema,
  createFeeRuleSchema,
} from './schemas.js'
import {
  listSettlements,
  getSettlementById,
  listFeeRules,
  createFeeRule,
} from './repository.js'
import { calculateSettlement } from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  return {
    async list(request: FastifyRequest, reply: FastifyReply) {
      const query = listSettlementsSchema.parse(request.query)
      const { settlements, total } = await listSettlements(fastify.db, query)
      return reply.send({
        settlements,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      })
    },

    async getById(
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) {
      const settlement = await getSettlementById(fastify.db, request.params.id)
      return reply.send(settlement)
    },

    async calculate(request: FastifyRequest, reply: FastifyReply) {
      const body = calculateSettlementSchema.parse(request.body)
      const settlement = await calculateSettlement(fastify.db, body)
      return reply.status(201).send(settlement)
    },

    async listFeeRules(request: FastifyRequest, reply: FastifyReply) {
      const query = listFeeRulesSchema.parse(request.query)
      const rules = await listFeeRules(fastify.db, query)
      return reply.send({ rules })
    },

    async createFeeRule(request: FastifyRequest, reply: FastifyReply) {
      const body = createFeeRuleSchema.parse(request.body)
      const rule = await createFeeRule(fastify.db, body)
      return reply.status(201).send(rule)
    },
  }
}
