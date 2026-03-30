import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: config.NODE_ENV === 'development'
      ? ['http://localhost:5173', 'http://localhost:5174']
      : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
}

export default fp(corsPlugin, { name: 'cors' })
