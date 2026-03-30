import Fastify from 'fastify'
import { config } from './config.js'
import databasePlugin from './plugins/database.js'
import corsPlugin from './plugins/cors.js'
import errorHandlerPlugin from './plugins/error-handler.js'
import { keywordsModule } from './modules/keywords/routes.js'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport:
      config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

await app.register(corsPlugin)
await app.register(errorHandlerPlugin)
await app.register(databasePlugin)

await app.register(keywordsModule, { prefix: '/api/keywords' })

app.get('/health', async () => ({ status: 'ok' }))

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  app.log.info(`서버 실행 중: http://localhost:${config.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
