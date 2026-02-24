// 전역 웹소켓 매니저
// 페이지를 떠나도 웹소켓 연결을 유지하기 위한 싱글톤 매니저
// 브라우저 탭이 백그라운드에 있어도 연결을 유지함

import { StudioJobWebSocket, type StudioJobUpdate } from './websocket'

// 브라우저 탭이 백그라운드에 있어도 웹소켓 연결을 유지하기 위한 설정
// Page Visibility API를 사용하여 탭이 보이지 않아도 연결 유지
if (typeof window !== 'undefined') {
  // 페이지가 보이지 않을 때도 웹소켓 연결 유지
  document.addEventListener('visibilitychange', () => {
    // 탭이 백그라운드로 가도 연결은 유지됨
    // 필요시 여기서 재연결 로직 추가 가능
  })
}

type UpdateCallback = (update: StudioJobUpdate) => void
type ErrorCallback = (error: Error) => void
type CloseCallback = () => void

interface WebSocketConnection {
  websocket: StudioJobWebSocket
  subscribers: Set<UpdateCallback>
  errorCallbacks: Set<ErrorCallback>
  closeCallbacks: Set<CloseCallback>
}

class WebSocketManager {
  private connections = new Map<string, WebSocketConnection>()

  /**
   * 웹소켓 연결을 가져오거나 생성합니다.
   * 같은 jobId에 대해 여러 구독자를 지원합니다.
   */
  async connect(
    jobId: string,
    onUpdate: UpdateCallback,
    onError?: ErrorCallback,
    onClose?: CloseCallback
  ): Promise<StudioJobWebSocket> {
    // 이미 연결이 있으면 구독자만 추가
    const existing = this.connections.get(jobId)
    if (existing && existing.websocket.isConnected()) {
      existing.subscribers.add(onUpdate)
      if (onError) existing.errorCallbacks.add(onError)
      if (onClose) existing.closeCallbacks.add(onClose)
      return existing.websocket
    }

    // 기존 연결이 있지만 끊어진 경우 정리
    if (existing) {
      existing.websocket.disconnect()
      this.connections.delete(jobId)
    }

    // 새 연결 생성
    const subscribers = new Set<UpdateCallback>([onUpdate])
    const errorCallbacks = new Set<ErrorCallback>()
    const closeCallbacks = new Set<CloseCallback>()

    if (onError) errorCallbacks.add(onError)
    if (onClose) closeCallbacks.add(onClose)

    // 모든 구독자에게 업데이트를 전달하는 래퍼 함수
    const broadcastUpdate = (update: StudioJobUpdate) => {
      subscribers.forEach((callback) => {
        try {
          callback(update)
        } catch (error) {
          console.error('[WebSocketManager] 구독자 콜백 에러:', error)
        }
      })
    }

    // 모든 에러 콜백에 에러를 전달하는 래퍼 함수
    const broadcastError = (error: Error) => {
      errorCallbacks.forEach((callback) => {
        try {
          callback(error)
        } catch (err) {
          console.error('[WebSocketManager] 에러 콜백 에러:', err)
        }
      })
    }

    // 모든 닫기 콜백을 호출하는 래퍼 함수
    const broadcastClose = () => {
      closeCallbacks.forEach((callback) => {
        try {
          callback()
        } catch (error) {
          console.error('[WebSocketManager] 닫기 콜백 에러:', error)
        }
      })
    }

    const websocket = new StudioJobWebSocket(
      jobId,
      broadcastUpdate,
      broadcastError,
      broadcastClose
    )

    const connection: WebSocketConnection = {
      websocket,
      subscribers,
      errorCallbacks,
      closeCallbacks,
    }

    this.connections.set(jobId, connection)

    try {
      await websocket.connect()
    } catch (error) {
      console.error('[WebSocketManager] 연결 실패, jobId:', jobId, error)
      this.connections.delete(jobId)
      throw error
    }

    return websocket
  }

  /**
   * 구독을 해제합니다.
   * 모든 구독자가 해제되면 웹소켓 연결도 끊습니다.
   */
  disconnect(jobId: string, onUpdate?: UpdateCallback, onError?: ErrorCallback, onClose?: CloseCallback): void {
    const connection = this.connections.get(jobId)
    if (!connection) {
      return
    }

    // 구독자 제거
    if (onUpdate) {
      connection.subscribers.delete(onUpdate)
    }
    if (onError) {
      connection.errorCallbacks.delete(onError)
    }
    if (onClose) {
      connection.closeCallbacks.delete(onClose)
    }

    // 모든 구독자가 없으면 연결 끊기
    if (connection.subscribers.size === 0) {
      connection.websocket.disconnect()
      this.connections.delete(jobId)
    }
  }

  /**
   * 특정 jobId의 연결 상태를 확인합니다.
   */
  isConnected(jobId: string): boolean {
    const connection = this.connections.get(jobId)
    return connection?.websocket.isConnected() ?? false
  }

  /**
   * 특정 jobId의 웹소켓 인스턴스를 가져옵니다.
   */
  getConnection(jobId: string): StudioJobWebSocket | null {
    return this.connections.get(jobId)?.websocket ?? null
  }

  /**
   * 모든 연결을 끊습니다 (앱 종료 시 사용).
   */
  disconnectAll(): void {
    this.connections.forEach((connection, _jobId) => {
      connection.websocket.disconnect()
    })
    this.connections.clear()
  }
}

// 싱글톤 인스턴스
export const websocketManager = new WebSocketManager()
