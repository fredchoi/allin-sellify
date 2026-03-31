import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config.js'

// ─────────────────────────────────────────────
// JWT payload 타입 (토큰에 저장되는 최소 정보)
// ─────────────────────────────────────────────

export interface JwtPayload {
  sellerId: string
  plan: 'starter' | 'pro' | 'business'
}

// ─────────────────────────────────────────────
// SellerContext — request에 주입되는 런타임 컨텍스트
// ─────────────────────────────────────────────

export interface SellerContext {
  sellerId: string
  plan: 'starter' | 'pro' | 'business'
  quotas: {
    dailyProducts: number
    dailyAnalyze: number
  }
}

// Fastify 타입 보강
declare module 'fastify' {
  interface FastifyRequest {
    seller: SellerContext
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

// ─────────────────────────────────────────────
// 플랜별 기본 쿼터
// ─────────────────────────────────────────────

const PLAN_QUOTAS: Record<JwtPayload['plan'], SellerContext['quotas']> = {
  starter: { dailyProducts: 50, dailyAnalyze: 20 },
  pro: { dailyProducts: 500, dailyAnalyze: 100 },
  business: { dailyProducts: 5000, dailyAnalyze: 500 },
}

// ─────────────────────────────────────────────
// Auth 플러그인
// ─────────────────────────────────────────────

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    },
  })

  // ─── authenticate preHandler ───────────────
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        const payload = request.user as JwtPayload
        request.seller = {
          sellerId: payload.sellerId,
          plan: payload.plan,
          quotas: PLAN_QUOTAS[payload.plan] ?? PLAN_QUOTAS.starter,
        }
      } catch {
        reply.status(401).send({ error: 'Unauthorized', message: '인증이 필요합니다.' })
      }
    },
  )
}

export default fp(authPlugin, { name: 'auth' })

// ─────────────────────────────────────────────
// 편의 타입 — FastifyInstance 보강
// ─────────────────────────────────────────────

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
