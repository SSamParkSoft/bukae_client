// WebSocket/STOMP 클라이언트 유틸리티
// 상품 검색 결과 실시간 수신용

import SockJS from 'sockjs-client'
import { Client, IMessage } from '@stomp/stompjs'
import type { ProductResponse } from '@/lib/types/products'
import { authStorage } from './auth-storage'

function getWebSocketUrl(): string {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://15.164.220.105.nip.io:8080'
  // SockJS는 http:// 또는 https:// URL을 받아야 함 (ws:// 또는 wss://는 사용 불가)
  // StudioJobWebSocket과 동일한 방식 사용
  return `${API_BASE_URL}/ws`
}

export interface ProductSearchUpdate {
  products: ProductResponse[]
}

export class ProductSearchWebSocket {
  private client: Client | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private productSubscription: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private errorSubscription: any = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10 // 최대 10번만 시도
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      // 연결 타임아웃 설정 (30초 - 서버 응답이 느릴 수 있으므로 여유있게 설정)
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
      }, 30000)

      try {
        // /ws/info의 502 에러 감지를 위한 XMLHttpRequest 가로채기
        const originalXHROpen = XMLHttpRequest.prototype.open
        const originalXHRSend = XMLHttpRequest.prototype.send
        let infoRequestFailed = false

        XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
          // /ws/info 요청 감지
          if (typeof url === 'string' && url.includes('/ws/info')) {
            console.log('[ProductSearchWebSocket] /ws/info 요청 감지:', url)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;(this as any).__isInfoRequest = true
          }
          return originalXHROpen.call(this, method, url, async ?? true, username ?? null, password ?? null)
        }

        XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const xhr = this as any
          
          if (xhr.__isInfoRequest) {
            xhr.addEventListener('load', function () {
              if (xhr.status === 502) {
                console.error('[ProductSearchWebSocket] /ws/info 502 에러 감지, 연결 강제 중단')
                infoRequestFailed = true
              }
            })
            
            xhr.addEventListener('error', function () {
              if (xhr.status === 502 || xhr.status === 0) {
                console.error('[ProductSearchWebSocket] /ws/info 요청 실패, 연결 강제 중단')
                infoRequestFailed = true
              }
            })
          }
          
          return originalXHRSend.call(this, body ?? null)
        }

        // SockJS 사용 (StudioJobWebSocket과 동일한 방식)
        // 네이티브 WebSocket은 code 1006으로 즉시 실패하므로 SockJS 사용
        console.log('[ProductSearchWebSocket] SockJS 연결 시작, URL:', wsUrl)
        this.socket = new SockJS(wsUrl)

        // /ws/info 502 에러 체크 (짧은 지연 후 확인)
        setTimeout(() => {
          if (infoRequestFailed && !this.isResolved && this.isConnecting) {
            console.error('[ProductSearchWebSocket] /ws/info 502 에러로 인한 연결 강제 중단')
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            if (this.client) {
              this.client.deactivate()
              this.client = null
            }
            if (this.socket) {
              this.socket.close()
              this.socket = null
            }
            // XMLHttpRequest 원복
            XMLHttpRequest.prototype.open = originalXHROpen
            XMLHttpRequest.prototype.send = originalXHRSend
            const err = new Error('/ws/info 요청이 502 에러로 실패했습니다. 서버 상태를 확인해주세요.')
            this.onError?.(err.message)
            reject(err)
          }
        }, 1000) // 1초 후 체크

        // SockJS 연결 에러 핸들링
        this.socket.onerror = () => {
          console.error('[ProductSearchWebSocket] SockJS onerror 발생')
          // XMLHttpRequest 원복
          XMLHttpRequest.prototype.open = originalXHROpen
          XMLHttpRequest.prototype.send = originalXHRSend
          
          if (this.isResolved) {
            return
          }

          this.isConnecting = false
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout)
            this.connectionTimeout = null
          }
          const err = new Error('WebSocket 연결에 실패했습니다. 서버 상태를 확인해주세요.')
          this.onError?.(err.message)
          reject(err)
        }

        // SockJS 연결 성공 이벤트
        this.socket.onopen = () => {
          console.log('[ProductSearchWebSocket] SockJS onopen - 연결 성공, STOMP CONNECT 대기')
        }

        // SockJS 연결 종료 이벤트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.socket.onclose = (event: any) => {
          console.log('[ProductSearchWebSocket] SockJS onclose:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            timestamp: new Date().toISOString()
          })
          // XMLHttpRequest 원복
          XMLHttpRequest.prototype.open = originalXHROpen
          XMLHttpRequest.prototype.send = originalXHRSend
          
          if (!this.isResolved && this.isConnecting) {
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            // STOMP 클라이언트 비활성화하여 재연결 중단
            if (this.client) {
              this.client.deactivate()
              this.client = null
            }
            // 502 Bad Gateway 등의 서버 에러 처리
            let errorMessage = 'WebSocket 연결이 실패했습니다.'
            if (event.code === 1006) {
              errorMessage = '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
            } else if (event.code === 1002) {
              errorMessage = '프로토콜 오류가 발생했습니다. 서버가 SockJS를 지원하지 않을 수 있습니다.'
            } else if (event.code >= 500) {
              errorMessage = `서버 오류가 발생했습니다 (${event.code}). 서버 관리자에게 문의하거나 잠시 후 다시 시도해주세요.`
            } else if (event.reason) {
              errorMessage = event.reason
            }
            const err = new Error(errorMessage)
            this.onError?.(err.message)
            reject(err)
          }
        }

        // STOMP CONNECT 프레임에 correlationId와 JWT 토큰 포함
        // API 문서: "연결 시점에 JWT 토큰 인증이 필요할 수 있습니다"
        const connectHeaders: Record<string, string> = {
          correlationId: this.correlationId,
        }
        
        // JWT 토큰이 있으면 헤더에 추가
        const accessToken = authStorage.getAccessToken()
        if (accessToken) {
          connectHeaders.Authorization = `Bearer ${accessToken}`
        }
        
        this.client = new Client({
          webSocketFactory: () => this.socket,
          reconnectDelay: 0, // 재연결 비활성화 (한 번만 시도, 실패 시 중단)
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          connectionTimeout: 0,
          connectHeaders: connectHeaders,
          debug: () => {
            // STOMP 클라이언트의 내부 디버그 메시지 비활성화
            // heartbeat 메시지(PING/PONG)는 정상 동작이므로 로그에서 제외
          },
          beforeConnect: () => {
            this.reconnectAttempts++
            console.log('[ProductSearchWebSocket] STOMP CONNECT 전송 직전, 시도 횟수:', this.reconnectAttempts, 'headers:', connectHeaders)
            
            // 10번 초과 시 강제로 연결 중단
            if (this.reconnectAttempts > this.maxReconnectAttempts) {
              console.error('[ProductSearchWebSocket] 최대 재연결 시도 횟수 초과, 연결 강제 중단')
              if (this.client) {
                this.client.deactivate()
                this.client = null
              }
              if (this.socket) {
                this.socket.close()
                this.socket = null
              }
              this.isConnecting = false
              if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout)
                this.connectionTimeout = null
              }
              const err = new Error('WebSocket 연결이 10번 시도 후에도 실패했습니다. 서버 상태를 확인해주세요.')
              this.onError?.(err.message)
              return
            }
          },
          onConnect: (frame) => {
            console.log('[ProductSearchWebSocket] STOMP CONNECTED 응답 받음:', frame)
            this.isConnecting = false
            this.isResolved = true
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            this.reconnectAttempts = 0 // 연결 성공 시 재연결 시도 횟수 초기화

            // 성공 채널 구독
            const productsTopic = `/topic/products.${this.correlationId}`
            this.productSubscription = this.client!.subscribe(
              productsTopic,
              (message: IMessage) => {
                try {
                  const payload: ProductResponse[] = JSON.parse(message.body)
                  this.onProducts(payload)
                } catch {
                  // 메시지 파싱 실패 시 무시
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
                } catch {
                  const errorMessage = message.body || '알 수 없는 에러가 발생했습니다.'
                  this.onError?.(errorMessage)
                }
              }
            )

            resolve()
          },
          onStompError: (frame) => {
            console.error('[ProductSearchWebSocket] STOMP 에러:', frame)
            this.isConnecting = false
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            // STOMP 클라이언트 비활성화하여 재연결 중단
            if (this.client) {
              this.client.deactivate()
              this.client = null
            }
            const errorMessage =
              frame.headers['message'] ||
              frame.body ||
              'STOMP 연결 오류가 발생했습니다.'
            const error = new Error(errorMessage)
            this.onError?.(error.message)
            reject(error)
          },
          onWebSocketClose: (event: CloseEvent) => {
            console.log('[ProductSearchWebSocket] STOMP onWebSocketClose:', {
              code: event.code,
              reason: event.reason,
              wasClean: event.wasClean,
              timestamp: new Date().toISOString()
            })
            
            this.productSubscription = null
            this.errorSubscription = null

            // 연결이 완료되지 않은 상태에서 닫히면 에러 처리 및 재연결 완전 중단
            if (!this.isResolved && this.isConnecting) {
              this.isConnecting = false
              if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout)
                this.connectionTimeout = null
              }
              
              // 10번 초과 시 강제로 연결 완전 중단
              if (this.reconnectAttempts > this.maxReconnectAttempts) {
                console.error('[ProductSearchWebSocket] 최대 재연결 시도 횟수 초과, 연결 강제 중단')
                if (this.client) {
                  this.client.deactivate()
                  this.client = null
                }
                if (this.socket) {
                  this.socket.close()
                  this.socket = null
                }
                const err = new Error('WebSocket 연결이 10번 시도 후에도 실패했습니다. 서버 상태를 확인해주세요.')
                this.onError?.(err.message)
                return
              }
              
              // STOMP 클라이언트 비활성화하여 재연결 완전 중단
              if (this.client) {
                this.client.deactivate()
                this.client = null
              }
              const errorMessage = event.reason || 'WebSocket 연결이 실패했습니다.'
              const err = new Error(errorMessage)
              this.onError?.(err.message)
              // reject는 이미 호출되었을 수 있으므로 중복 호출 방지
            }

            if (this.isResolved && this.client) {
              this.onClose?.()
            }
          },
          onDisconnect: () => {
            this.productSubscription = null
            this.errorSubscription = null
          },
        })

        console.log('[ProductSearchWebSocket] STOMP 클라이언트 활성화 시작, correlationId:', this.correlationId)
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

