import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  CreateContentPostSchema,
  PublishChannelSchema,
  ListContentQuerySchema,
} from './schemas.js'
import * as service from './service.js'

export function buildHandlers(fastify: FastifyInstance) {
  const db = fastify.db
  const log = fastify.log

  return {
    // POST /api/content — 마스터 콘텐츠 생성 + 채널 변환 시작
    create: async (req: FastifyRequest, reply: FastifyReply) => {
      const body = CreateContentPostSchema.parse(req.body)
      const postId = await service.createContentPost(db, body, log)
      reply.code(202).send({ id: postId, status: 'generating' })
    },

    // GET /api/content — 목록 조회
    list: async (req: FastifyRequest, reply: FastifyReply) => {
      const query = ListContentQuerySchema.parse(req.query)
      const result = await service.listPosts(db, query)
      reply.send({
        data: result.rows,
        total: result.total,
        page: query.page,
        pageSize: query.pageSize,
      })
    },

    // GET /api/content/:id — 상세 조회 (채널별 콘텐츠 포함)
    get: async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const post = await service.getPostDetail(db, req.params.id)
      if (!post) {
        return reply.code(404).send({ error: '콘텐츠를 찾을 수 없습니다' })
      }
      reply.send(post)
    },

    // POST /api/content/:id/publish — 채널 발행
    publish: async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const body = PublishChannelSchema.parse(req.body)
      const result = await service.publishChannels(db, req.params.id, body, log)
      reply.send(result)
    },
  }
}
