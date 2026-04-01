import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { buildHandlers } from './handlers.js'

// ─────────────────────────────────────────────
// 관리자 인증 미들웨어
// ─────────────────────────────────────────────

async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    const payload = request.user as Record<string, unknown>

    if (payload['role'] !== 'admin' && payload['role'] !== 'super_admin') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.',
      })
    }
  } catch {
    return reply.status(401).send({
      error: 'UNAUTHORIZED',
      message: '인증이 필요합니다.',
    })
  }
}

// ─────────────────────────────────────────────
// 라우트 등록
// ─────────────────────────────────────────────

export async function adminModule(fastify: FastifyInstance) {
  const h = buildHandlers(fastify)

  // Public: 관리자 로그인
  fastify.post('/login', h.login)

  // Protected: 관리자 인증 필요
  fastify.get('/kpi', { preHandler: [adminAuth] }, h.kpi)

  fastify.get('/sellers', { preHandler: [adminAuth] }, h.sellersList)
  fastify.patch('/sellers/:id/status', { preHandler: [adminAuth] }, h.sellersUpdateStatus)

  fastify.get('/jobs', { preHandler: [adminAuth] }, h.jobsList)
  fastify.post('/jobs/:id/retry', { preHandler: [adminAuth] }, h.jobsRetry)

  fastify.get('/system/stats', { preHandler: [adminAuth] }, h.systemStats)
}
