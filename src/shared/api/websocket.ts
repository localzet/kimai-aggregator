import { mixIdApi } from './mixIdApi'

export interface WebSocketMessage {
  type: string
  [key: string]: any
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isConnecting = false
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map()
  private messageQueue: WebSocketMessage[] = []
  private isOnline = navigator.onLine

  constructor() {
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect()
      }
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  connect() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return
    }

    const config = mixIdApi.getConfig()
    if (!config || !config.accessToken) {
      return
    }

    this.isConnecting = true

    try {
      const apiBase = config.apiBase || import.meta.env.VITE_MIX_ID_API_BASE || 'http://localhost:3000/api'
      const wsUrl = apiBase.replace(/^http/, 'ws').replace(/\/api$/, '') + '/ws'
      const ws = new WebSocket(`${wsUrl}?token=${config.accessToken}`)

      ws.onopen = () => {
        this.ws = ws
        this.isConnecting = false
        this.reconnectAttempts = 0
        console.log('WebSocket connected')

        // Dispatch custom event for connection status update
        window.dispatchEvent(new Event('mixid-ws-status-changed'))

        // Send queued messages
        this.flushMessageQueue()
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage
          this.handleMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }

      ws.onclose = () => {
        this.ws = null
        this.isConnecting = false
        
        // Dispatch custom event for connection status update
        window.dispatchEvent(new Event('mixid-ws-status-changed'))
        
        this.attemptReconnect()
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.isConnecting = false
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    if (!this.isOnline) {
      // Wait for online event
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)

    setTimeout(() => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.connect()
      }
    }, delay)
  }

  private handleMessage(message: WebSocketMessage) {
    // Handle ping/pong
    if (message.type === 'ping') {
      this.send({ type: 'pong' })
      return
    }

    // Call registered event handlers
    const handlers = this.eventHandlers.get(message.type)
    if (handlers) {
      handlers.forEach((handler) => handler(message))
    }

    // Also call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*')
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(message))
    }
  }

  send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for later
      this.messageQueue.push(message)
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
  }

  on(eventType: string, handler: WebSocketEventHandler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    this.eventHandlers.get(eventType)!.add(handler)
  }

  off(eventType: string, handler: WebSocketEventHandler) {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.eventHandlers.clear()
    this.messageQueue = []
    this.reconnectAttempts = 0
    
    // Dispatch custom event for connection status update
    window.dispatchEvent(new Event('mixid-ws-status-changed'))
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WebSocketClient()

