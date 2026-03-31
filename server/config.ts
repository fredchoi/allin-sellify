import 'dotenv/config'
import { z } from 'zod'

const configSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  KEYWORD_ADAPTER_MODE: z.enum(['mock', 'real']).default('mock'),
  NAVER_AD_API_KEY: z.string().optional(),
  NAVER_AD_SECRET: z.string().optional(),
  NAVER_AD_CUSTOMER_ID: z.string().optional(),
  NAVER_DATALAB_CLIENT_ID: z.string().optional(),
  NAVER_DATALAB_CLIENT_SECRET: z.string().optional(),
  // Module 02: 도매/AI 설정
  WHOLESALE_ADAPTER: z.enum(['domeggook', 'mock']).default('mock'),
  DOMEGGOOK_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  // Phase 0: Redis + BullMQ + Sentry
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SENTRY_DSN: z.string().optional(),
  // 블로그·SNS 콘텐츠 발행
  SNS_API_MODE: z.enum(['mock', 'real']).default('mock'),
  // Phase 0: JWT 인증
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default('dev-jwt-secret-must-be-changed-in-production!!'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('환경변수 설정 오류:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
