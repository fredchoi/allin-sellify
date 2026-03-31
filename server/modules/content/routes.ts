import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function contentModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  // 마스터 콘텐츠 생성 (202 Accepted — 백그라운드 채널 변환)
  fastify.post('/', h.create)

  // 콘텐츠 목록 조회
  fastify.get('/', h.list)

  // 콘텐츠 상세 조회 (채널별 변환 결과 포함)
  fastify.get('/:id', h.get)

  // 채널 발행 (ready 상태인 콘텐츠만 가능)
  fastify.post('/:id/publish', h.publish)
}
