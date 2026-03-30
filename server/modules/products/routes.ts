import type { FastifyInstance } from 'fastify'
import { buildHandlers } from './handlers.js'

export async function productsModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  // 도매 상품 수집 (도매 API → DB 저장)
  fastify.post('/collect', h.collect)

  // 도매 상품 목록
  fastify.get('/wholesale', h.listWholesale)

  // AI 가공 요청 (202 Accepted — 백그라운드 처리)
  fastify.post('/process', h.process)

  // 가공 상품 목록
  fastify.get('/processed', h.listProcessed)

  // 가공 상품 상세
  fastify.get('/processed/:id', h.getProcessed)

  // 가공 결과 수정
  fastify.patch('/processed/:id', h.updateProcessed)

  // 마켓 등록
  fastify.post('/listings', h.createListing)
}
