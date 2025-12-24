// WebSocket/STOMP 클라이언트 유틸리티
// 상품 검색 결과 실시간 수신용

import SockJS from 'sockjs-client'
import { Client, IMessage } from '@stomp/stompjs'
import { authStorage } from './auth-storage'
import type { ProductResponse } from '@/lib/types/products'

function getWebSocketUrl(): string {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
  // SockJS는 http:// 또는 https:// URL을 받아야 함 (ws:// 또는 wss://는 사용 불가)
  // 상품 검색은 /ws-stomp 엔드포인트 사용
  return `${API_BASE_URL}/ws-stomp`
}

export interface ProductSearchUpdate {
  products: ProductResponse[]
}

export class ProductSearchWebSocket {
  private client: Client | null = null
  private productSubscription: any = null
  private errorSubscription: any = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private socket: any = null
  private connectionTimeout: NodeJS.Timeout | null = null
  private isResolved = false
  private isConnecting = false

  constructor(
    private correlationId: string,
    private onProducts: (products: ProductResponse[]) => void,
    private onError?: (error: string) => void,
    private onClose?: () => void
  ) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = getWebSocketUrl()

      this.isResolved = false
      this.isConnecting = true

      // 연결 타임아웃 설정 (10초)
      this.connectionTimeout = setTimeout(() => {
        if (this.isResolved) {
          return
        }

        if (this.isConnecting && !this.isResolved) {
          this.isConnecting = false
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          const error = new Error('WebSocket connection timeout')
          this.onError?.(error.message)
          resolve()
        }
      }, 10000)

      try {
        this.socket = new SockJS(wsUrl)

        // SockJS 연결 에러 핸들링
        this.socket.onerror = (error: any) => {
          if (this.isResolved) {
            return
          }

          this.isConnecting = false
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          const err = new Error('WebSocket connection failed')
          this.onError?.(err.message)
          reject(err)
        }

        // SockJS 연결 성공 이벤트
        this.socket.onopen = () => {
          // 연결이 시작되었음을 알림
        }

        // SockJS 연결 종료 이벤트
        this.socket.onclose = (event: any) => {
          if (!this.isResolved && this.isConnecting) {
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            const err = new Error(
              `WebSocket closed before connection completed (code: ${event.code}, reason: ${event.reason || 'unknown'})`
            )
            this.onError?.(err.message)
            reject(err)
          }
        }

        // JWT 토큰 가져오기 (handshake 시 사용)
        const accessToken = authStorage.getAccessToken()

        this.client = new Client({
          webSocketFactory: () => this.socket,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectionTimeout: 0,
          // JWT 토큰을 헤더에 포함
          connectHeaders: accessToken
            ? {
                Authorization: `Bearer ${accessToken}`,
              }
            : {},
          onConnect: () => {
            this.isConnecting = false
            this.isResolved = true
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            this.reconnectAttempts = 0

            // 성공 채널 구독
            const productsTopic = `/topic/products.${this.correlationId}`
            this.productSubscription = this.client!.subscribe(
              productsTopic,
              (message: IMessage) => {
                try {
                  const payload: ProductResponse[] = JSON.parse(message.body)
                  this.onProducts(payload)
                } catch (error) {
                  console.error('[ProductSearchWebSocket] 상품 목록 파싱 실패:', error)
                }
              }
            )

            // 에러 채널 구독
            const errorsTopic = `/topic/errors.${this.correlationId}`
            this.errorSubscription = this.client!.subscribe(
              errorsTopic,
              (message: IMessage) => {
                try {
                  const errorMessage: string = JSON.parse(message.body)
                  this.onError?.(errorMessage)
                } catch (error) {
                  const errorMessage = message.body || '알 수 없는 에러가 발생했습니다.'
                  this.onError?.(errorMessage)
                }
              }
            )

            resolve()
          },
          onStompError: (frame) => {
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            const error = new Error(
              frame.headers['message'] || 'STOMP connection error'
            )
            this.onError?.(error.message)
            reject(error)
          },
          onWebSocketClose: (event: CloseEvent) => {
            this.productSubscription = null
            this.errorSubscription = null

            if (this.isResolved && this.client) {
              this.onClose?.()
            }
          },
          onDisconnect: () => {
            this.productSubscription = null
            this.errorSubscription = null
          },
        })

        this.client.activate()
      } catch (error) {
        this.isConnecting = false
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout)
          this.connectionTimeout = null
        }
        const err =
          error instanceof Error
            ? error
            : new Error('Failed to create WebSocket connection')
        this.onError?.(err.message)
        reject(err)
      }
    })
  }

  disconnect(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    if (this.productSubscription) {
      this.productSubscription.unsubscribe()
      this.productSubscription = null
    }

    if (this.errorSubscription) {
      this.errorSubscription.unsubscribe()
      this.errorSubscription = null
    }

    if (this.client) {
      this.client.deactivate()
      this.client = null
    }

    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  isConnected(): boolean {
    return this.client?.connected ?? false
  }

  getCurrentCorrelationId(): string {
    return this.correlationId
  }
}

