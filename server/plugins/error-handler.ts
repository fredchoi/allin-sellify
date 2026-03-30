import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

async function errorHandlerPlugin(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
      })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: '입력값이 올바르지 않습니다',
        details: error.flatten().fieldErrors,
      })
    }

    request.log.error({ err: error }, '처리되지 않은 에러')
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: '서버 오류가 발생했습니다',
    })
  })
}

export default fp(errorHandlerPlugin, { name: 'error-handler' })
