/**
 * Transport 기반 렌더링 시스템 타입 정의
 * PHASE0: Transport 타임라인 시간 `t`를 중심으로 한 결정적 렌더링
 */

import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import type { ITransport } from '../transport/types'
import type { StageDimensions } from '../types/common'

/**
 * renderAt 옵션
 */
export interface RenderAtOptions {
  /** 애니메이션 스킵 여부 */
  skipAnimation?: boolean
  /** 강제 전환 효과 */
  forceTransition?: string
  /** 강제 씬 인덱스 (지정하면 tSec 계산 대신 이 씬을 직접 렌더링) */
  forceSceneIndex?: number
  /** 강제 렌더링 (중복 체크 우회) */
  forceRender?: boolean
}

/**
 * 씬 로딩 상태
 */
export type SceneLoadingState = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * 씬 로딩 상태 맵
 */
export type SceneLoadingStateMap = Map<number, SceneLoadingState>

/**
 * Transport 렌더러 파라미터
 */
export interface UseTransportRendererParams {
  /** Transport 인스턴스 */
  transport: ITransport | null
  /** 타임라인 데이터 */
  timeline: TimelineData | null
  /** PixiJS Application ref */
  appRef: React.RefObject<PIXI.Application | null>
  /** PixiJS Container ref */
  containerRef: React.RefObject<PIXI.Container | null>
  /** 스프라이트 맵 ref */
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  /** 텍스트 맵 ref */
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  /** 현재 씬 인덱스 ref */
  currentSceneIndexRef: React.MutableRefObject<number>
  /** 이전 씬 인덱스 ref */
  previousSceneIndexRef: React.MutableRefObject<number | null>
  /** 활성 애니메이션 맵 ref */
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  /** 스테이지 크기 */
  stageDimensions: StageDimensions
  /** TTS 캐시 ref */
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  /** 음성 템플릿 */
  voiceTemplate?: string | null
  /** 씬 마크업 생성 함수 */
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  /** TTS 키 생성 함수 */
  makeTtsKey?: (voiceName: string, markup: string) => string
  /** TTS 세그먼트 활성 세그먼트 조회 함수 (재생 중 TTS 파일 전환 감지용) */
  getActiveSegment?: (tSec: number) => { segment: { id: string; sceneIndex?: number; partIndex?: number }; segmentIndex: number } | null
  /** 텍스처 로드 함수 */
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  /** 전환 효과 적용 함수 */
  applyEnterEffect?: (
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    forceTransition?: string,
    onComplete?: () => void,
    previousIndex?: number | null,
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>,
    sceneId?: number,
    isPlaying?: boolean
  ) => void
  /** 씬 로드 완료 콜백 */
  onSceneLoadComplete?: (sceneIndex: number) => void
}

/**
 * Transport 렌더러 반환 타입
 */
export interface UseTransportRendererReturn {
  /** renderAt(t) 함수 - 타임라인 시간 t에 해당하는 프레임을 결정적으로 렌더링 */
  renderAt: (tSec: number, options?: RenderAtOptions) => void
  /** 씬 로딩 상태 맵 */
  sceneLoadingStates: SceneLoadingStateMap
  /** 특정 씬 로드 */
  loadScene: (sceneIndex: number) => Promise<void>
  /** 모든 씬 로드 */
  loadAllScenes: () => Promise<void>
  /** 렌더링 캐시 리셋 (TTS duration 변경 시 사용) */
  resetRenderCache: () => void
}

/**
 * BGM 트랙 타입 (향후 확장용)
 */
export interface BgmTrack {
  /** 트랙 ID */
  id: string
  /** 오디오 URL */
  url: string
  /** 타임라인 시작 시간 (초) */
  startSec: number
  /** 볼륨 (0.0 ~ 1.0) */
  volume: number
  /** 루프 여부 */
  loop: boolean
}

/**
 * 효과음 트랙 타입 (향후 확장용)
 */
export interface SoundEffectTrack {
  /** 트랙 ID */
  id: string
  /** 오디오 URL */
  url: string
  /** 타임라인 시작 시간 (초) */
  startSec: number
  /** 볼륨 (0.0 ~ 1.0) */
  volume: number
  /** 씬 인덱스 */
  sceneIndex: number
  /** 구간 인덱스 */
  partIndex: number
}
