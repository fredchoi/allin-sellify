import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @ts-expect-error vitest@3 test config not yet typed for vite@8
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/index.ts',
        'server/db/**',
        'server/config.ts',
        'server/adapters/naver-ad-adapter.ts',
        'server/adapters/naver-datalab-adapter.ts',
        'server/adapters/naver-smartstore-adapter.ts',
        'server/adapters/keyword-adapter-factory.ts',
        'server/adapters/marketplace-adapter-factory.ts',
        'server/plugins/database.ts',
        'server/plugins/cors.ts',
        'server/plugins/bullmq.ts',
        'server/plugins/redis.ts',
        'server/plugins/sentry.ts',
        'server/modules/*/repository.ts',
        'server/services/fingerprint.ts',
        'server/services/image-processing.ts',
        'server/services/queues.ts',
        'server/lib/**',
        'server/types/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  server: {
    port: 5174,
    allowedHosts: ['www.sellify.kr', 'sellify.kr'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
