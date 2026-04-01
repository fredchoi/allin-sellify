// WebSocket 실시간 알림 플러그인
//
// 셀러별 WebSocket 연결을 관리하고, appEvents를 통해
// 워커에서 발생한 이벤트를 연결된 클라이언트에 전달한다.
//
//   Client → GET /api/v1/ws?token=JWT → WebSocket 연결
//   Worker → appEvents.emit('notify', { sellerId, event }) → 이 플러그인 → 클라이언트

import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { appEvents, APP_EVENT_NOTIFY } from '../lib/events.js'
import type { NotifyEvent, AppNotification } from '../lib/events.js'

type ClientMap = Map<string, Set<WebSocket>>

declare module 'fastify' {
  interface FastifyInstance {
    wsClients: ClientMap
    notify: (sellerId: string, event: NotifyEvent) => void
  }
}

async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(websocket)

  const clients: ClientMap = new Map()

  fastify.decorate('wsClients', clients)

  fastify.decorate('notify', (sellerId: string, event: NotifyEvent) => {
    const connections = clients.get(sellerId)
    if (!connections || connections.size === 0) return

    const payload = JSON.stringify(event)
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(payload)
      }
    }
  })

  // appEvents 리스너 — 워커에서 emit된 이벤트를 WebSocket으로 전달
  const onNotify = (notification: AppNotification) => {
    fastify.notify(notification.sellerId, notification.event)
  }
  appEvents.on(APP_EVENT_NOTIFY, onNotify)

  // WebSocket 라우트: GET /api/v1/ws?token=JWT
  fastify.get('/api/v1/ws', { websocket: true }, async (socket: WebSocket, req: FastifyRequest) => {
    // query param에서 token 추출 후 JWT 검증
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token')

    if (!token) {
      socket.close(4001, '토큰이 필요합니다')
      return
    }

    try {
      const payload = fastify.jwt.verify<{ sellerId: string; plan: string }>(token)
      const { sellerId } = payload

      // 연결 등록
      if (!clients.has(sellerId)) {
        clients.set(sellerId, new Set())
      }
      clients.get(sellerId)!.add(socket)

      fastify.log.info({ sellerId }, 'WebSocket 연결됨')

      // 연결 확인 메시지
      socket.send(JSON.stringify({
        type: 'connected',
        data: { sellerId },
        timestamp: new Date().toISOString(),
      }))

      // ping/pong 헬스체크 (30초 간격)
      const pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          socket.ping()
        }
      }, 30_000)

      socket.on('close', () => {
        clearInterval(pingInterval)
        const sellerConns = clients.get(sellerId)
        if (sellerConns) {
          sellerConns.delete(socket)
          if (sellerConns.size === 0) {
            clients.delete(sellerId)
          }
        }
        fastify.log.info({ sellerId }, 'WebSocket 연결 해제')
      })

      socket.on('error', (err) => {
        fastify.log.error({ sellerId, err: err.message }, 'WebSocket 오류')
      })
    } catch {
      socket.close(4003, '인증 실패')
    }
  })

  // 플러그인 정리
  fastify.addHook('onClose', async () => {
    appEvents.off(APP_EVENT_NOTIFY, onNotify)
    for (const [, connections] of clients) {
      for (const ws of connections) {
        ws.close(1001, '서버 종료')
      }
    }
    clients.clear()
  })
}

export default fp(websocketPlugin, {
  name: 'websocket',
  dependencies: ['auth'],
})
