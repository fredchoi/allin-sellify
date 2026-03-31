import Fastify from 'fastify'
import { config } from './config.js'
import databasePlugin from './plugins/database.js'
import corsPlugin from './plugins/cors.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import sentryPlugin from './plugins/sentry.js'
import redisPlugin from './plugins/redis.js'
import bullmqPlugin from './plugins/bullmq.js'
import authPlugin from './plugins/auth.js'
import rateLimitPlugin from './plugins/rate-limit.js'
import { authModule } from './modules/auth/routes.js'
import { keywordsModule } from './modules/keywords/routes.js'
import { leadsModule } from './modules/leads/routes.js'
import { settlementsModule } from './modules/settlements/routes.js'
import { storesModule } from './modules/stores/routes.js'
import { productsModule } from './modules/products/routes.js'
import { contentModule } from './modules/content/routes.js'
import { inventoryModule } from './modules/inventory/routes.js'
import { ordersModule } from './modules/orders/routes.js'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

await app.register(sentryPlugin)
await app.register(corsPlugin)
await app.register(errorHandlerPlugin)
await app.register(databasePlugin)
await app.register(redisPlugin)
await app.register(bullmqPlugin)
await app.register(authPlugin)
await app.register(rateLimitPlugin)

// API v1 라우트
await app.register(authModule, { prefix: '/api/v1/auth' })
await app.register(keywordsModule, { prefix: '/api/v1/keywords' })
await app.register(leadsModule, { prefix: '/api/v1/leads' })
await app.register(settlementsModule, { prefix: '/api/v1/settlements' })
await app.register(storesModule, { prefix: '/api/v1/stores' })
await app.register(productsModule, { prefix: '/api/v1/products' })
await app.register(contentModule, { prefix: '/api/v1/content' })
await app.register(inventoryModule, { prefix: '/api/v1/inventory' })
await app.register(ordersModule, { prefix: '/api/v1/orders' })

app.get('/health', async () => ({ status: 'ok' }))

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`서버 실행 중: http://localhost:${config.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
