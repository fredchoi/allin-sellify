// 앱 내부 이벤트 버스 — 워커 → WebSocket 브릿지
//
// BullMQ 워커는 Fastify 인스턴스에 직접 접근할 수 없으므로
// Node.js EventEmitter를 중간 버스로 사용한다.
//
//   Worker → appEvents.emit() → websocket plugin listener → WebSocket push

import { EventEmitter } from 'node:events'

export interface NotifyEvent {
  type: 'order_received' | 'stockout_detected' | 'listing_paused' | 'inventory_synced'
  data: Record<string, unknown>
  timestamp: string
}

export interface AppNotification {
  sellerId: string
  event: NotifyEvent
}

export const appEvents = new EventEmitter()

// 이벤트 이름 상수
export const APP_EVENT_NOTIFY = 'notify' as const
