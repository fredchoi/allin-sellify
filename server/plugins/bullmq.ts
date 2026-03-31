import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import type { Queue } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { FastifyAdapter } from '@bull-board/fastify'
import { queues } from '../services/queues.js'

declare module 'fastify' {
  interface FastifyInstance {
    queues: typeof queues
    inventoryQueue: Queue
    orderQueue: Queue
  }
}

const bullmqPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('queues', queues)
  app.decorate('inventoryQueue', queues.inventorySync)
  app.decorate('orderQueue', queues.orderCollect)

  // Bull Board 대시보드 (개발 환경에서만 활성화)
  if (process.env['NODE_ENV'] !== 'production') {
    const serverAdapter = new FastifyAdapter()
    serverAdapter.setBasePath('/admin/queues')

    createBullBoard({
      queues: Object.values(queues).map((q) => new BullMQAdapter(q)),
      serverAdapter,
    })

    await app.register(serverAdapter.registerPlugin(), {
      prefix: '/admin/queues',
      basePath: '/admin/queues',
    })

    // /admin/queues 기본 인증 (개발 환경이라도 보호)
    app.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith('/admin/queues') && app.authenticate) {
        try {
          await app.authenticate(request, reply)
        } catch {
          // 인증 실패 시 401 (authenticate가 이미 reply.send 호출)
        }
      }
    })

    app.log.info('Bull Board 대시보드 활성화: http://localhost:3001/admin/queues')
  }

  app.addHook('onClose', async () => {
    await Promise.all(
      Object.values(queues).map((q) => q.close())
    )
    app.log.info('BullMQ 큐 연결 종료')
  })

  app.log.info('BullMQ 큐 초기화 완료 (5개: wholesale-crawl, ai-process, market-publish, inventory-sync, order-collect)')
}

export default fp(bullmqPlugin, { name: 'bullmq' })
