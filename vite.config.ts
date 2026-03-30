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
        'server/adapters/naver-*.ts',
        'server/adapters/keyword-adapter-factory.ts',
        'server/plugins/database.ts',
        'server/plugins/cors.ts',
        'server/modules/keywords/repository.ts',
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
