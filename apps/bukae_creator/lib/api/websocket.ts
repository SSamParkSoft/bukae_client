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
  private socket: any = null
  private connectionTimeout: NodeJS.Timeout | null = null
  private isResolved = false // 연결이 성공적으로 완료되었는지 추적
  private isConnecting = false // 연결 시도 중인지 추적

  constructor(
    private jobId: string,
    private onUpdate: (update: StudioJobUpdate) => void,
    private onError?: (error: Error) => void,
    private onClose?: () => void // 연결이 끊어졌을 때 호출될 콜백
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = getWebSocketUrl()
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[WebSocket] Connecting to:', wsUrl)
      }
      
      this.isResolved = false
      this.isConnecting = true
      
      // 연결 타임아웃 설정 (30초 - SockJS 연결은 시간이 걸릴 수 있음)
      this.connectionTimeout = setTimeout(() => {
        // 이미 연결이 완료되었으면 타임아웃 무시
        if (this.isResolved) {
          return
        }
        
        // 연결 시도 중이고 아직 완료되지 않았으면 타임아웃 처리
        if (this.isConnecting && !this.isResolved) {
          console.warn('[WebSocket] Connection timeout after 30 seconds - falling back to HTTP polling')
          this.isConnecting = false
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          const error = new Error('WebSocket connection timeout')
          this.onError?.(error)
          reject(error)
        }
      }, 30000) // 30초로 증가
      
      try {
        this.socket = new SockJS(wsUrl)
        
        // SockJS 연결 에러 핸들링
        this.socket.onerror = (error: any) => {
          // 이미 연결이 완료되었으면 에러 무시
          if (this.isResolved) {
            return
          }
          
          console.error('[WebSocket] SockJS connection error:', error)
          this.isConnecting = false
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          const err = new Error('WebSocket connection failed')
          this.onError?.(err)
          reject(err)
        }
        
        // SockJS 연결 성공 이벤트 (연결이 시작되었음을 알림)
        this.socket.onopen = () => {
          console.log('[WebSocket] ✅ SockJS connection opened - waiting for STOMP handshake...')
          // SockJS 연결이 열렸지만 아직 STOMP 핸드셰이크가 완료되지 않았으므로
          // isResolved는 onConnect에서 설정됨
        }
        
        // SockJS 연결 종료 이벤트
        this.socket.onclose = (event: any) => {
          console.log('[WebSocket] ⚠️ SockJS connection closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            isResolved: this.isResolved
          })
          
          // 연결이 완료되기 전에 끊어졌으면 에러 처리
          if (!this.isResolved && this.isConnecting) {
            console.error('[WebSocket] ❌ 연결이 완료되기 전에 끊어졌습니다.')
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            const err = new Error(`WebSocket closed before connection completed (code: ${event.code}, reason: ${event.reason || 'unknown'})`)
            this.onError?.(err)
            reject(err)
          }
        }
        
        this.client = new Client({
          webSocketFactory: () => this.socket,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          // 디버그 모드 활성화 (개발 환경에서만)
          debug: (str: string) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[WebSocket] STOMP Debug:', str)
            }
          },
          onConnect: () => {
            console.log('[WebSocket] Connected and STOMP handshake completed')
            
            // 타임아웃 클리어 및 연결 완료 표시
            this.isConnecting = false
            this.isResolved = true
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            this.reconnectAttempts = 0
            
            const topic = `/topic/studio.jobs.${this.jobId}`
            console.log(`[WebSocket] 구독 중: ${topic}`)
            
            this.subscription = this.client!.subscribe(topic, (message: IMessage) => {
              try {
                const payload: StudioJobUpdate = JSON.parse(message.body)
                console.log('[WebSocket] ✅ 실시간 메시지 수신:', {
                  jobId: payload.jobId,
                  status: payload.status,
                  progressDetail: payload.progressDetail,
                  timestamp: new Date().toISOString()
                })
                this.onUpdate(payload)
              } catch (error) {
                console.error('[WebSocket] ❌ 메시지 파싱 실패:', error, 'Raw message:', message.body)
              }
            })
            
            console.log(`[WebSocket] ✅ 구독 완료: ${topic} - 실시간 업데이트 대기 중...`)
            resolve()
          },
          onStompError: (frame) => {
            console.error('[WebSocket] STOMP error:', frame)
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            const error = new Error(frame.headers['message'] || 'STOMP connection error')
            this.onError?.(error)
            reject(error)
          },
          onWebSocketClose: (event: CloseEvent) => {
            console.log('[WebSocket] ⚠️ STOMP WebSocket closed:', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              isResolved: this.isResolved,
              isConnected: this.client?.connected
            })
            this.subscription = null
            
            // 연결이 완료된 후에 끊어진 경우에만 onClose 콜백 호출
            // (의도적으로 끊은 경우가 아니고, 연결이 완료된 상태에서 끊어진 경우)
            if (this.isResolved && this.client) {
              console.log('[WebSocket] 연결이 완료된 후 끊어짐 - HTTP 폴링으로 전환')
              this.onClose?.()
            } else if (!this.isResolved) {
              console.warn('[WebSocket] 연결 완료 전에 끊어짐 - 이미 SockJS onclose에서 처리됨')
            }
          },
          onDisconnect: () => {
            console.log('[WebSocket] Disconnected')
            this.subscription = null
          },
        })

        this.client.activate()
      } catch (error) {
        this.isConnecting = false
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
        console.error('[WebSocket] Failed to create connection:', error)
        const err = error instanceof Error ? error : new Error('Failed to create WebSocket connection')
        this.onError?.(err)
        reject(err)
      }
    })
  }

  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }
    
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    
    if (this.client) {
      this.client.deactivate()
      this.client = null
    }
    
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
    
    console.log('[WebSocket] Disconnected')
  }

  isConnected(): boolean {
    return this.client?.connected ?? false
  }
}

