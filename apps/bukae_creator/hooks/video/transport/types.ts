/**
 * Transport 모듈 타입 정의
 * 편집기 재생 엔진의 상태 및 인터페이스 정의
 */

/**
 * Transport 상태
 * 재생 엔진의 현재 상태를 나타냅니다.
 */
export type TransportState = {
  /** 재생 중 여부 */
  isPlaying: boolean
  /** 일시정지/정지 시점의 타임라인 시간 (초) */
  timelineOffsetSec: number
  /** play() 시점의 audioContext.currentTime (초) */
  audioCtxStartSec: number
  /** 재생 속도 (1.0 = 정상 속도) */
  playbackRate: number
  /** 전체 타임라인 길이 (초) */
  totalDuration: number
}

/**
 * Transport 이벤트 타입
 */
export type TransportEvent = 
  | { type: 'play'; time: number }
  | { type: 'pause'; time: number }
  | { type: 'seek'; time: number }
  | { type: 'rateChange'; rate: number }
  | { type: 'timeUpdate'; time: number }

/**
 * Transport 구독 콜백 함수 타입
 * @param time 현재 타임라인 시간 (초)
 */
export type TransportSubscriber = (time: number) => void

/**
 * Transport 인터페이스
 */
export interface ITransport {
  /** 재생 시작 */
  play(): void
  /** 일시정지 */
  pause(): void
  /** 특정 시간으로 이동 */
  seek(tSec: number): void
  /** 재생 속도 설정 */
  setRate(rate: number): void
  /** 현재 타임라인 시간 반환 (초) */
  getTime(): number
  /** 상태 구독 */
  subscribe(callback: TransportSubscriber, skipImmediate?: boolean): () => void
  /** 현재 상태 반환 */
  getState(): TransportState
  /** 전체 타임라인 길이 설정 */
  setTotalDuration(duration: number): void
}
