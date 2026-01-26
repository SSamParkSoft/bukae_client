/**
 * TtsTrack 모듈 타입 정의
 * TTS 세그먼트 테이블 및 오디오 트랙 관리
 */

/**
 * TTS 세그먼트
 * 타임라인에서 연속된 TTS 오디오 트랙의 한 구간을 나타냅니다.
 */
export type TtsSegment = {
  /** 세그먼트 고유 ID */
  id: string
  /** 오디오 파일 URL 또는 Blob URL */
  url: string
  /** 타임라인 기준 시작 시간 (초) */
  startSec: number
  /** 세그먼트 길이 (초) */
  durationSec: number
  /** 씬 ID (선택사항) */
  sceneId?: number | string
  /** 씬 인덱스 (선택사항) */
  sceneIndex?: number
  /** 구간 인덱스 (선택사항) */
  partIndex?: number
  /** 텍스트 범위 (선택사항) */
  textRange?: { start: number; end: number }
  /** 마크업 (선택사항) */
  markup?: string
}

/**
 * 활성 세그먼트 정보
 * 현재 재생 중인 세그먼트와 오프셋 정보
 */
export type ActiveSegment = {
  /** 세그먼트 */
  segment: TtsSegment
  /** 세그먼트 내 오프셋 (초) */
  offset: number
  /** 세그먼트 인덱스 */
  segmentIndex: number
}

/**
 * TtsTrack 상태
 */
export type TtsTrackState = {
  /** 세그먼트 목록 */
  segments: TtsSegment[]
  /** 로딩 중인 세그먼트 수 */
  loadingCount: number
  /** 재생 중인 세그먼트 인덱스 */
  activeSegmentIndex: number | null
}
