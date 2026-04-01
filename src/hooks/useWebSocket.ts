import { useState, useEffect, useRef, useCallback } from 'react'

interface WsMessage {
  type: string
  payload: unknown
  timestamp: string
}

interface UseWebSocketReturn {
  messages: WsMessage[]
  isConnected: boolean
}

const MAX_MESSAGES = 50
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_ATTEMPTS = 10

export function useWebSocket(token: string | null): UseWebSocketReturn {
  const [messages, setMessages] = useState<WsMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimer.current !== null) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
  }, [])

  useEffect(() => {
    if (!token) return

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const url = `${protocol}//${host}/api/v1/ws?token=${encodeURIComponent(token ?? '')}`

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const parsed: WsMessage = JSON.parse(event.data)
          setMessages((prev) => {
            const next = [...prev, parsed]
            return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
          })
        } catch {
          /* 파싱 불가 메시지 무시 */
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null

        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      clearReconnectTimer()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [token, clearReconnectTimer])

  return { messages, isConnected }
}
