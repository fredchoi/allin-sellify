import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import {
  adminLoginSchema,
  listSellersQuerySchema,
  updateSellerStatusSchema,
  sellerIdParamSchema,
  listJobsQuerySchema,
  jobIdParamSchema,
} from './schemas.js'
import { loginAdmin } from './service.js'
import {
  getPlatformKpi,
  listSellers,
  updateSellerStatus,
  listJobs,
  retryJob,
  getSystemStats,
} from './repository.js'
import { AppError } from '../../plugins/error-handler.js'

export function buildHandlers(fastify: FastifyInstance) {
  const db = fastify.db

  return {
    // ── 관리자 로그인 (public) ──────────────────
    async login(request: FastifyRequest, reply: FastifyReply) {
      const input = adminLoginSchema.parse(request.body)
      const result = await loginAdmin(db, fastify, input)
      return reply.status(200).send(result)
    },

    // ── 플랫폼 KPI ─────────────────────────────
    async kpi(_request: FastifyRequest, reply: FastifyReply) {
      const kpi = await getPlatformKpi(db)
      return reply.send(kpi)
    },

    // ── 셀러 목록 ──────────────────────────────
    async sellersList(request: FastifyRequest, reply: FastifyReply) {
      const query = listSellersQuerySchema.parse(request.query)
      const result = await listSellers(db, query)
      return reply.send(result)
    },

    // ── 셀러 상태 변경 ─────────────────────────
    async sellersUpdateStatus(request: FastifyRequest, reply: FastifyReply) {
      const { id } = sellerIdParamSchema.parse(request.params)
      const { status } = updateSellerStatusSchema.parse(request.body)
      const updated = await updateSellerStatus(db, id, status)

      if (!updated) {
        throw new AppError(404, '셀러를 찾을 수 없습니다.', 'NOT_FOUND')
      }

      return reply.send(updated)
    },

    // ── 잡 큐 목록 ─────────────────────────────
    async jobsList(request: FastifyRequest, reply: FastifyReply) {
      const query = listJobsQuerySchema.parse(request.query)
      const result = await listJobs(db, query)
      return reply.send(result)
    },

    // ── 잡 재시도 ──────────────────────────────
    async jobsRetry(request: FastifyRequest, reply: FastifyReply) {
      const { id } = jobIdParamSchema.parse(request.params)
      const retried = await retryJob(db, id)

      if (!retried) {
        throw new AppError(404, '재시도할 수 있는 실패 잡을 찾을 수 없습니다.', 'NOT_FOUND')
      }

      return reply.send(retried)
    },

    // ── 시스템 통계 ─────────────────────────────
    async systemStats(_request: FastifyRequest, reply: FastifyReply) {
      const stats = await getSystemStats(db)
      return reply.send(stats)
    },
  }
}
