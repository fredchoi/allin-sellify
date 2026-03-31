import fp from 'fastify-plugin'
import { FastifyPluginCallback } from 'fastify'
import { Redis } from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis
  }
}

const redisPlugin: FastifyPluginCallback = (fastify, _opts, done) => {
  const redis = new Redis({
    host: process.env['REDIS_HOST'] ?? '127.0.0.1',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379'),
    maxRetriesPerRequest: null,
    lazyConnect: true,
  })

  fastify.decorate('redis', redis)
  fastify.addHook('onClose', async () => { await redis.quit() })
  done()
}

export default fp(redisPlugin, { name: 'redis' })
