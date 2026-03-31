import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'

// AI 처리 엔드포인트 경로 목록
export const AI_ENDPOINT_PATHS = [
  '/api/v1/products/process',
  '/api/v1/content',
]

// AI 엔드포인트 여부 판별 (쿼리스트링 제외 후 비교)
export function isAiEndpoint(url: string): boolean {
  const path = url.split('?')[0]
  return AI_ENDPOINT_PATHS.some((pattern) => path === pattern)
}

// rate limit 에러 생성 헬퍼 — Error 객체를 반환해야 error-handler가 statusCode를 인식함
function buildRateLimitError(message: string, after: string, statusCode: number): Error {
  const err = new Error(message) as Error & { statusCode: number; retryAfter: string }
  err.statusCode = statusCode
  err.retryAfter = after
  return err
}

async function rateLimitPlugin(fastify: FastifyInstance) {
  // AI 엔드포인트 onRoute 훅: @fastify/rate-limit 훅보다 먼저 등록하여 per-route config 설정
  fastify.addHook('onRoute', (routeOptions) => {
    if (isAiEndpoint(routeOptions.url)) {
      routeOptions.config = {
        ...routeOptions.config,
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          errorResponseBuilder: (_req: unknown, context: { after: string; statusCode: number }) =>
            buildRateLimitError(
              `AI 요청 한도(분당 10회)를 초과했습니다. ${context.after} 후 다시 시도하세요.`,
              context.after,
              context.statusCode,
            ),
        },
      }
    }
  })

  await fastify.register(rateLimit, {
    // 전역 기본값: 분당 60 요청
    max: 60,
    timeWindow: '1 minute',
    // 헬스체크 제외
    allowList: (request: { url: string }, _key: string) => request.url === '/health',
    errorResponseBuilder: (_request: unknown, context: { after: string; statusCode: number }) =>
      buildRateLimitError(
        `요청 한도를 초과했습니다. ${context.after} 후 다시 시도하세요.`,
        context.after,
        context.statusCode,
      ),
  })
}

export default fp(rateLimitPlugin, { name: 'rate-limit' })
