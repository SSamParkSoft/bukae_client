// WebSocket/STOMP 클라이언트 유틸리티
// Studio Job 상태 실시간 수신용

import SockJS from 'sockjs-client'
import { Client, IMessage } from '@stomp/stompjs'

function getWebSocketUrl(): string {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
  // SockJS는 http:// 또는 https:// URL을 받아야 함 (ws:// 또는 wss://는 사용 불가)
  return `${API_BASE_URL}/ws`
}

export interface StudioJobUpdate {
  jobId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progressDetail?: {
    step?: string
    percent?: number
    msg?: string
    message?: string
    progress?: number
    error?: string
  } | string
  resultVideoUrl?: string | null
  errorMessage?: string
  error?: { message?: string }
  updatedAt?: string
}

export class StudioJobWebSocket {
  private client: Client | null = null
  private subscription: any = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(
    private jobId: string,
    private onUpdate: (update: StudioJobUpdate) => void,
    private onError?: (error: Error) => void
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = getWebSocketUrl()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[WebSocket] Connecting to:', wsUrl)
      }
      
      const socket = new SockJS(wsUrl)
      
      this.client = new Client({
        webSocketFactory: () => socket,
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('[WebSocket] Connected')
          this.reconnectAttempts = 0
          
          const topic = `/topic/studio.jobs.${this.jobId}`
          console.log(`[WebSocket] Subscribing to: ${topic}`)
          
          this.subscription = this.client!.subscribe(topic, (message: IMessage) => {
            try {
              const payload: StudioJobUpdate = JSON.parse(message.body)
              console.log('[WebSocket] Received update:', payload)
              this.onUpdate(payload)
            } catch (error) {
              console.error('[WebSocket] Failed to parse message:', error)
            }
          })
          
          resolve()
        },
        onStompError: (frame) => {
          console.error('[WebSocket] STOMP error:', frame)
          const error = new Error(frame.headers['message'] || 'STOMP connection error')
          this.onError?.(error)
          reject(error)
        },
        onWebSocketClose: () => {
          console.log('[WebSocket] Connection closed')
          this.subscription = null
        },
        onDisconnect: () => {
          console.log('[WebSocket] Disconnected')
          this.subscription = null
        },
      })

      this.client.activate()
    })
  }

  disconnect(): void {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    
    if (this.client) {
      this.client.deactivate()
      this.client = null
    }
    
    console.log('[WebSocket] Disconnected')
  }

  isConnected(): boolean {
    return this.client?.connected ?? false
  }
}

