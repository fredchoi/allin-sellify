import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import rateLimitPlugin, { isAiEndpoint, AI_ENDPOINT_PATHS } from '../rate-limit.js'
import errorHandlerPlugin from '../error-handler.js'

// ─────────────────────────────────────────────
// 테스트 헬퍼
// ─────────────────────────────────────────────

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  // error-handler는 rate-limit 앞에 등록 (프로덕션 순서와 동일)
  await app.register(errorHandlerPlugin)
  await app.register(rateLimitPlugin)

  // 일반 엔드포인트
  app.get('/api/v1/keywords', async () => ({ data: 'keywords' }))

  // AI 엔드포인트 (POST /api/v1/products/process)
  app.post('/api/v1/products/process', async () => ({ jobId: 'test-job' }))

  // AI 엔드포인트 (POST /api/v1/content)
  app.post('/api/v1/content', async () => ({ postId: 'test-post' }))

  // 헬스체크
  app.get('/health', async () => ({ status: 'ok' }))

  await app.ready()
  return app
}

// ─────────────────────────────────────────────
// isAiEndpoint 단위 테스트
// ─────────────────────────────────────────────

describe('isAiEndpoint', () => {
  it('/api/v1/products/process 는 AI 엔드포인트이다', () => {
    expect(isAiEndpoint('/api/v1/products/process')).toBe(true)
  })

  it('/api/v1/content 는 AI 엔드포인트이다', () => {
    expect(isAiEndpoint('/api/v1/content')).toBe(true)
  })

  it('쿼리스트링이 포함된 AI 엔드포인트도 판별된다', () => {
    expect(isAiEndpoint('/api/v1/products/process?debug=true')).toBe(true)
    expect(isAiEndpoint('/api/v1/content?preview=1')).toBe(true)
  })

  it('/api/v1/keywords 는 AI 엔드포인트가 아니다', () => {
    expect(isAiEndpoint('/api/v1/keywords')).toBe(false)
  })

  it('/health 는 AI 엔드포인트가 아니다', () => {
    expect(isAiEndpoint('/health')).toBe(false)
  })

  it('/api/v1/products/wholesale 는 AI 엔드포인트가 아니다', () => {
    expect(isAiEndpoint('/api/v1/products/wholesale')).toBe(false)
  })

  it('/api/v1/products/processed 는 AI 엔드포인트가 아니다', () => {
    expect(isAiEndpoint('/api/v1/products/processed')).toBe(false)
  })
})

// ─────────────────────────────────────────────
// AI_ENDPOINT_PATHS 상수 테스트
// ─────────────────────────────────────────────

describe('AI_ENDPOINT_PATHS', () => {
  it('products/process 경로가 포함된다', () => {
    expect(AI_ENDPOINT_PATHS).toContain('/api/v1/products/process')
  })

  it('content 경로가 포함된다', () => {
    expect(AI_ENDPOINT_PATHS).toContain('/api/v1/content')
  })
})

// ─────────────────────────────────────────────
// 플러그인 등록 테스트
// ─────────────────────────────────────────────

describe('rateLimitPlugin 등록', () => {
  it('플러그인이 에러 없이 등록된다', async () => {
    const app = Fastify({ logger: false })
    await expect(app.register(rateLimitPlugin)).resolves.not.toThrow()
    await app.close()
  })
})

// ─────────────────────────────────────────────
// 헬스체크 rate limit 제외 테스트
// ─────────────────────────────────────────────

describe('/health rate limit 제외', () => {
  it('헬스체크는 rate limit에 걸리지 않는다 (70회 연속 요청)', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 70; i++) {
        const res = await app.inject({ method: 'GET', url: '/health' })
        expect(res.statusCode).toBe(200)
      }
    } finally {
      await app.close()
    }
  })
})

// ─────────────────────────────────────────────
// 일반 엔드포인트 rate limit 테스트 (분당 60회)
// ─────────────────────────────────────────────

describe('일반 엔드포인트 rate limit', () => {
  it('60회까지는 정상 응답을 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 60; i++) {
        const res = await app.inject({ method: 'GET', url: '/api/v1/keywords' })
        expect(res.statusCode).toBe(200)
      }
    } finally {
      await app.close()
    }
  })

  it('61번째 요청은 429를 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 60; i++) {
        await app.inject({ method: 'GET', url: '/api/v1/keywords' })
      }
      const res = await app.inject({ method: 'GET', url: '/api/v1/keywords' })
      expect(res.statusCode).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('429 응답에 한국어 에러 메시지가 포함된다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 60; i++) {
        await app.inject({ method: 'GET', url: '/api/v1/keywords' })
      }
      const res = await app.inject({ method: 'GET', url: '/api/v1/keywords' })
      const body = res.json()
      expect(body.error).toBe('Too Many Requests')
      expect(body.message).toContain('요청 한도를 초과했습니다')
      expect(body.retryAfter).toBeDefined()
    } finally {
      await app.close()
    }
  })
})

// ─────────────────────────────────────────────
// AI 엔드포인트 rate limit 테스트 (분당 10회)
// ─────────────────────────────────────────────

describe('AI 엔드포인트 rate limit (분당 10회)', () => {
  it('products/process: 10회까지는 정상 응답을 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({ method: 'POST', url: '/api/v1/products/process' })
        expect(res.statusCode).toBe(200)
      }
    } finally {
      await app.close()
    }
  })

  it('products/process: 11번째 요청은 429를 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 10; i++) {
        await app.inject({ method: 'POST', url: '/api/v1/products/process' })
      }
      const res = await app.inject({ method: 'POST', url: '/api/v1/products/process' })
      expect(res.statusCode).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('content: 10회까지는 정상 응답을 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 10; i++) {
        const res = await app.inject({ method: 'POST', url: '/api/v1/content' })
        expect(res.statusCode).toBe(200)
      }
    } finally {
      await app.close()
    }
  })

  it('content: 11번째 요청은 429를 반환한다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 10; i++) {
        await app.inject({ method: 'POST', url: '/api/v1/content' })
      }
      const res = await app.inject({ method: 'POST', url: '/api/v1/content' })
      expect(res.statusCode).toBe(429)
    } finally {
      await app.close()
    }
  })

  it('AI 엔드포인트 429 응답에 한국어 에러 메시지가 포함된다', async () => {
    const app = await buildApp()
    try {
      for (let i = 0; i < 10; i++) {
        await app.inject({ method: 'POST', url: '/api/v1/content' })
      }
      const res = await app.inject({ method: 'POST', url: '/api/v1/content' })
      const body = res.json()
      expect(body.error).toBe('Too Many Requests')
      expect(body.message).toContain('AI 요청 한도')
      expect(body.retryAfter).toBeDefined()
    } finally {
      await app.close()
    }
  })

  it('AI 엔드포인트는 일반 엔드포인트보다 낮은 한도를 가진다', async () => {
    const app = await buildApp()
    try {
      // 11번 AI 요청 → 429
      for (let i = 0; i < 10; i++) {
        await app.inject({ method: 'POST', url: '/api/v1/products/process' })
      }
      const aiRes = await app.inject({ method: 'POST', url: '/api/v1/products/process' })
      expect(aiRes.statusCode).toBe(429)

      // 같은 횟수의 일반 요청 → 200 (아직 60회 한도 미도달)
      const normalRes = await app.inject({ method: 'GET', url: '/api/v1/keywords' })
      expect(normalRes.statusCode).toBe(200)
    } finally {
      await app.close()
    }
  })
})
