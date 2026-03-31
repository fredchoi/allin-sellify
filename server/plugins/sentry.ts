import fp from 'fastify-plugin'
import * as Sentry from '@sentry/node'
import type { FastifyPluginAsync } from 'fastify'
import { config } from '../config.js'

const sentryPlugin: FastifyPluginAsync = async (app) => {
  if (!config.SENTRY_DSN) {
    app.log.warn('SENTRY_DSN 미설정 — Sentry 에러 모니터링 비활성화')
    return
  }

  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
  })

  // 모든 요청에서 발생한 에러를 Sentry로 전송 (요청 컨텍스트 포함)
  app.addHook('onError', async (request, _reply, error) => {
    Sentry.withScope((scope) => {
      scope.setTag('method', request.method)
      scope.setTag('url', request.url)
      scope.setContext('request', {
        method: request.method,
        url: request.url,
        headers: request.headers,
        remoteAddress: request.ip,
      })
      Sentry.captureException(error)
    })
  })

  app.addHook('onClose', async () => {
    await Sentry.close(2000)
    app.log.info('Sentry 종료')
  })

  app.log.info('Sentry 에러 모니터링 초기화 완료')
}

export default fp(sentryPlugin, { name: 'sentry' })
