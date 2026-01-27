/**
 * Transport - 편집기 재생 엔진
 * 
 * Web Audio API를 마스터 클럭으로 사용하여 타임라인 시간 `t`를 절대 기준으로 관리합니다.
 * 모든 재생 상태는 이 클래스를 통해 일원화됩니다.
 */

import type { TransportState, TransportSubscriber, ITransport } from './types'

export class Transport implements ITransport {
  private audioContext: AudioContext
  private state: TransportState
  private subscribers: Set<TransportSubscriber>
  private tickInterval: number | null = null
  private readonly TICK_INTERVAL_MS = 16 // ~60fps
  private lastNotifyTime: number = 0
  private readonly NOTIFY_THROTTLE_MS = 100 // notifySubscribers throttle (100ms)

  constructor(audioContext?: AudioContext) {
    // AudioContext 생성 또는 재사용
    if (audioContext) {
      this.audioContext = audioContext
    } else {
      // 클라이언트 환경에서만 AudioContext 생성
      if (typeof window === 'undefined') {
        throw new Error('Transport requires AudioContext in client environment')
      }
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // 초기 상태
    this.state = {
      isPlaying: false,
      timelineOffsetSec: 0,
      audioCtxStartSec: 0,
      playbackRate: 1.0,
      totalDuration: 0,
    }

    this.subscribers = new Set()
  }

  /**
   * 재생 시작
   */
  play(): void {
    if (this.state.isPlaying) {
      return
    }

    // AudioContext가 suspended 상태면 resume
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    // 재생 시작 시점의 AudioContext 시간 저장
    this.state.audioCtxStartSec = this.audioContext.currentTime
    this.state.isPlaying = true

    // 구독자에게 알림
    this.notifySubscribers()

    // tick 루프 시작
    this.startTickLoop()
  }

  /**
   * 일시정지
   */
  pause(): void {
    if (!this.state.isPlaying) {
      return
    }

    // 현재 시간을 저장
    const currentT = this.getTime()
    this.state.timelineOffsetSec = currentT
    this.state.isPlaying = false

    // tick 루프 중지
    this.stopTickLoop()

    // 구독자에게 알림
    this.notifySubscribers()
  }

  /**
   * 특정 시간으로 이동 (seek)
   */
  seek(tSec: number): void {
    // 범위 체크
    const clampedT = Math.max(0, Math.min(tSec, this.state.totalDuration))

    // 현재 재생 중이면 일시정지
    const wasPlaying = this.state.isPlaying
    if (wasPlaying) {
      this.pause()
    }

    // 시간 설정
    this.state.timelineOffsetSec = clampedT

    // 재생 중이었으면 재개
    if (wasPlaying) {
      this.play()
    } else {
      // 구독자에게 알림 (정지 상태에서 seek)
      this.notifySubscribers()
    }
  }

  /**
   * 재생 속도 설정
   */
  setRate(rate: number): void {
    if (rate <= 0) {
      throw new Error('재생 속도는 0보다 커야 합니다.')
    }

    // 재생 중이면 현재 시간을 먼저 저장
    if (this.state.isPlaying) {
      const currentT = this.getTime()
      this.state.timelineOffsetSec = currentT
      this.state.audioCtxStartSec = this.audioContext.currentTime
    }

    this.state.playbackRate = rate

    // 구독자에게 알림
    this.notifySubscribers()
  }

  /**
   * 현재 타임라인 시간 반환 (초)
   * 
   * 재생 중: timelineOffsetSec + (audioContext.currentTime - audioCtxStartSec) * playbackRate
   * 정지 중: timelineOffsetSec
   */
  getTime(): number {
    if (!this.state.isPlaying) {
      return this.state.timelineOffsetSec
    }

    const audioCtxNow = this.audioContext.currentTime
    const elapsed = audioCtxNow - this.state.audioCtxStartSec
    const timelineElapsed = elapsed * this.state.playbackRate
    const currentT = this.state.timelineOffsetSec + timelineElapsed

    // totalDuration을 넘지 않도록 제한
    return Math.min(currentT, this.state.totalDuration)
  }

  /**
   * 상태 구독
   * @param callback 시간 업데이트 시 호출될 콜백
   * @param skipImmediate 즉시 콜백 호출을 건너뛸지 여부 (무한 루프 방지)
   * @returns 구독 해제 함수
   */
  subscribe(callback: TransportSubscriber, skipImmediate: boolean = false): () => void {
    this.subscribers.add(callback)

    // 즉시 현재 시간 전달 (skipImmediate가 false일 때만)
    if (!skipImmediate) {
      // requestAnimationFrame으로 지연시켜 무한 루프 방지
      requestAnimationFrame(() => {
        if (this.subscribers.has(callback)) {
          callback(this.getTime())
        }
      })
    }

    // 구독 해제 함수 반환
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * 현재 상태 반환
   */
  getState(): TransportState {
    return { ...this.state }
  }

  /**
   * 전체 타임라인 길이 설정
   */
  setTotalDuration(duration: number): void {
    if (duration < 0) {
      throw new Error('타임라인 길이는 0 이상이어야 합니다.')
    }

    this.state.totalDuration = duration

    // 현재 시간이 totalDuration을 넘으면 조정
    if (this.state.timelineOffsetSec > duration) {
      this.state.timelineOffsetSec = duration
      if (this.state.isPlaying) {
        this.pause()
      }
    }

    // 구독자에게 알림
    this.notifySubscribers()
  }

  /**
   * 구독자에게 시간 업데이트 알림 (throttled)
   */
  private notifySubscribers(): void {
    const now = performance.now()
    const timeSinceLastNotify = now - this.lastNotifyTime
    
    // 100ms마다만 구독자에게 알림 (과도한 React 렌더링 방지)
    if (timeSinceLastNotify < this.NOTIFY_THROTTLE_MS) {
      return
    }
    
    this.lastNotifyTime = now
    const currentTime = this.getTime()
    this.subscribers.forEach(callback => {
      try {
        callback(currentTime)
      } catch (error) {
        console.error('[Transport] 구독자 콜백 오류:', error)
      }
    })
  }

  /**
   * Tick 루프 시작 (재생 중 시간 업데이트)
   */
  private startTickLoop(): void {
    if (this.tickInterval !== null) {
      return
    }

    // requestAnimationFrame 기반 tick
    const tick = () => {
      if (!this.state.isPlaying) {
        this.tickInterval = null
        return
      }

      this.notifySubscribers()
      this.tickInterval = requestAnimationFrame(tick) as unknown as number
    }

    this.tickInterval = requestAnimationFrame(tick) as unknown as number
  }

  /**
   * Tick 루프 중지
   */
  private stopTickLoop(): void {
    if (this.tickInterval !== null) {
      cancelAnimationFrame(this.tickInterval)
      this.tickInterval = null
    }
  }

  /**
   * AudioContext 반환 (TtsTrack 등에서 사용)
   */
  getAudioContext(): AudioContext {
    return this.audioContext
  }

  /**
   * 정리 (컴포넌트 언마운트 시 호출)
   */
  dispose(): void {
    this.stopTickLoop()
    this.subscribers.clear()
    
    // AudioContext는 다른 곳에서도 사용될 수 있으므로 닫지 않음
    // 필요시 외부에서 audioContext.close() 호출
  }
}
