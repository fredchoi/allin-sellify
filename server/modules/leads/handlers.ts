import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createLeadSchema } from './schemas.js'
import { buildLeadsRepository } from './repository.js'

export function buildHandlers(fastify: FastifyInstance) {
  const repo = buildLeadsRepository(fastify.db)

  async function create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = createLeadSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: '입력값이 올바르지 않습니다.', details: parsed.error.flatten().fieldErrors })
    }

    try {
      const lead = await repo.create(parsed.data)
      return reply.status(201).send({ success: true, id: lead.id })
    } catch (err) {
      fastify.log.error(err, '리드 저장 실패')
      return reply.status(500).send({ error: '신청 처리 중 오류가 발생했습니다.' })
    }
  }

  async function stats(_req: FastifyRequest, reply: FastifyReply) {
    const total = await repo.count()
    return reply.send({ total })
  }

  return { create, stats }
}
