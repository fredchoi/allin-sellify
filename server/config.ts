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
})

const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('환경변수 설정 오류:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = parsed.data
