import fp from 'fastify-plugin'
import { Pool } from 'pg'
import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Pool
  }
}

async function databasePlugin(fastify: FastifyInstance) {
  const pool = new Pool({ connectionString: config.DATABASE_URL })

  await pool.query('SELECT 1')
  fastify.log.info('데이터베이스 연결 성공')

  fastify.decorate('db', pool)

  fastify.addHook('onClose', async () => {
    await pool.end()
    fastify.log.info('데이터베이스 연결 종료')
  })
}

export default fp(databasePlugin, { name: 'database' })
