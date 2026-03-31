import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { authModule } from '../routes.js'
import errorHandlerPlugin, { AppError } from '../../../plugins/error-handler.js'
import * as service from '../service.js'

// ─────────────────────────────────────────────
// 의존성 모킹
// ─────────────────────────────────────────────

vi.mock('../service.js', () => ({
  loginSeller: vi.fn(),
  refreshAccessToken: vi.fn(),
  logoutSeller: vi.fn(),
}))

// ─────────────────────────────────────────────
// 테스트 서버 헬퍼
// ─────────────────────────────────────────────

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  await app.register(errorHandlerPlugin)

  app.decorate('db', {
    query: vi.fn(),
    end: vi.fn(),
  } as any)

  await app.register(authModule, { prefix: '/api/v1/auth' })
  return app
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  it('유효한 자격증명으로 accessToken과 refreshToken을 반환한다', async () => {
    vi.mocked(service.loginSeller).mockResolvedValue({
      accessToken: 'access-token-abc',
      refreshToken: 'refresh-token-xyz',
      seller: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: '테스트셀러',
        plan: 'starter',
      },
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com', password: 'password123' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('accessToken')
    expect(body).toHaveProperty('refreshToken')
    expect(body).toHaveProperty('seller')
    expect(body.seller.email).toBe('test@example.com')
  })

  it('이메일 없이 요청하면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { password: 'password123' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('비밀번호 없이 요청하면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@example.com' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('잘못된 자격증명이면 401을 반환한다', async () => {
    vi.mocked(service.loginSeller).mockRejectedValue(
      new AppError(401, '인증 실패', 'UNAUTHORIZED'),
    )

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'wrong@example.com', password: 'wrong' },
    })
    expect(response.statusCode).toBe(401)
  })
})

describe('POST /api/v1/auth/refresh', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  it('유효한 refreshToken으로 새 accessToken을 반환한다', async () => {
    vi.mocked(service.refreshAccessToken).mockResolvedValue({
      accessToken: 'new-access-token',
    })

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'valid-refresh-token' },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toHaveProperty('accessToken')
  })

  it('refreshToken 없이 요청하면 400을 반환한다', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/v1/auth/logout', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildTestApp()
  })

  it('유효한 refreshToken으로 로그아웃하면 204를 반환한다', async () => {
    vi.mocked(service.logoutSeller).mockResolvedValue(undefined)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken: 'valid-refresh-token' },
    })

    expect(response.statusCode).toBe(204)
  })
})
