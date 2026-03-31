import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import authPlugin from '../auth.js'

// ─────────────────────────────────────────────
// 테스트 헬퍼
// ─────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-secret-must-be-at-least-32-chars!!'

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  // config mock을 위해 환경변수 설정
  process.env['JWT_SECRET'] = TEST_JWT_SECRET
  process.env['JWT_ACCESS_EXPIRES_IN'] = '15m'

  await app.register(authPlugin)

  // 보호된 테스트 라우트
  app.get('/protected', { preHandler: [app.authenticate] }, async (request, _reply) => {
    return { seller: request.seller }
  })

  return app
}

// ─────────────────────────────────────────────
// 테스트용 JWT 생성 헬퍼
// ─────────────────────────────────────────────

async function generateToken(
  app: FastifyInstance,
  payload: { sellerId: string; plan: 'starter' | 'pro' | 'business' },
): Promise<string> {
  return app.jwt.sign(payload)
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('authPlugin - authenticate 데코레이터', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildApp()
  })

  it('유효한 JWT로 요청 시 seller context가 주입된다', async () => {
    const token = await generateToken(app, {
      sellerId: '550e8400-e29b-41d4-a716-446655440000',
      plan: 'starter',
    })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.seller.sellerId).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(body.seller.plan).toBe('starter')
    expect(body.seller.quotas).toEqual({ dailyProducts: 50, dailyAnalyze: 20 })
  })

  it('pro 플랜 JWT로 요청 시 pro 쿼터가 주입된다', async () => {
    const token = await generateToken(app, {
      sellerId: 'seller-pro-id-00000-000000000000000',
      plan: 'pro',
    })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.seller.plan).toBe('pro')
    expect(body.seller.quotas).toEqual({ dailyProducts: 500, dailyAnalyze: 100 })
  })

  it('business 플랜 JWT로 요청 시 business 쿼터가 주입된다', async () => {
    const token = await generateToken(app, {
      sellerId: 'seller-biz-id-000-000000000000000',
      plan: 'business',
    })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.seller.plan).toBe('business')
    expect(body.seller.quotas).toEqual({ dailyProducts: 5000, dailyAnalyze: 500 })
  })

  it('Authorization 헤더 없이 요청 시 401을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
    })

    expect(response.statusCode).toBe(401)
    const body = response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('잘못된 형식의 토큰으로 요청 시 401을 반환한다', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer invalid.token.here' },
    })

    expect(response.statusCode).toBe(401)
  })

  it('만료된 토큰으로 요청 시 401을 반환한다', async () => {
    const expiredToken = app.jwt.sign(
      { sellerId: 'seller-id', plan: 'starter' },
      { expiresIn: '-1s' },
    )

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${expiredToken}` },
    })

    expect(response.statusCode).toBe(401)
  })

  it('Bearer 없이 토큰만 전달하면 401을 반환한다', async () => {
    const token = await generateToken(app, {
      sellerId: '550e8400-e29b-41d4-a716-446655440000',
      plan: 'starter',
    })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: token },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe('authPlugin - SellerContext 쿼터 기본값', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildApp()
  })

  it('starter 플랜 쿼터는 dailyProducts 50, dailyAnalyze 20이다', async () => {
    const token = await generateToken(app, { sellerId: 'test-id', plan: 'starter' })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    const body = response.json()
    expect(body.seller.quotas.dailyProducts).toBe(50)
    expect(body.seller.quotas.dailyAnalyze).toBe(20)
  })

  it('pro 플랜 쿼터는 dailyProducts 500, dailyAnalyze 100이다', async () => {
    const token = await generateToken(app, { sellerId: 'test-id', plan: 'pro' })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    const body = response.json()
    expect(body.seller.quotas.dailyProducts).toBe(500)
    expect(body.seller.quotas.dailyAnalyze).toBe(100)
  })

  it('business 플랜 쿼터는 dailyProducts 5000, dailyAnalyze 500이다', async () => {
    const token = await generateToken(app, { sellerId: 'test-id', plan: 'business' })

    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })

    const body = response.json()
    expect(body.seller.quotas.dailyProducts).toBe(5000)
    expect(body.seller.quotas.dailyAnalyze).toBe(500)
  })
})
