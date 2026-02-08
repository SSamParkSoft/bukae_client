/**
 * 파이프라인 단계 간 공유 타입 정의
 */

import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { RenderAtOptions } from '../types'
import type { StageDimensions } from '../../types/common'

/**
 * 파이프라인 컨텍스트
 * 각 단계에서 사용하는 공통 컨텍스트
 */
export interface PipelineContext {
  // 기본 파라미터
  timeline: TimelineData
  tSec: number
  options?: RenderAtOptions
  
  // Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  lastRenderedTRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSegmentIndexRef: React.MutableRefObject<number>
  lastRenderedStateRef: React.MutableRefObject<{
    t: number
    sceneIndex: number
    partIndex: number
    transitionProgress: number
    motionProgress: number
  } | null>
  lastTransitionLogRef: React.MutableRefObject<{
    sceneIndex: number
    progress: number
    logType: 'READY' | 'IN_PROGRESS' | 'COMPLETED' | null
  } | null>
  sceneContainersRef: React.MutableRefObject<Map<number, PIXI.Container>>
  subtitleContainerRef: React.MutableRefObject<PIXI.Container | null>
  transitionQuadContainerRef: React.MutableRefObject<PIXI.Container | null>
  transitionShaderManagerRef: React.MutableRefObject<any | null>
  fabricCanvasRef?: React.RefObject<any>
  fabricScaleRatioRef?: React.MutableRefObject<number>
  
  // 상태
  sceneLoadingStates: Map<number, 'idle' | 'loading' | 'loaded' | 'error'>
  
  // 함수들
  loadScene: (sceneIndex: number) => Promise<void>
  resetBaseStateCallback: (
    sprite: PIXI.Sprite | null,
    text: PIXI.Text | null,
    sceneIndex: number,
    scene: any
  ) => void
  applyShaderTransition: (
    tSec: number,
    sceneIndex: number,
    previousSceneIndex: number | null,
    transitionType: string,
    scene: any
  ) => void
  applyDirectTransition: (
    currentSprite: PIXI.Sprite,
    previousSprite: PIXI.Sprite | null,
    transitionType: string,
    progress: number,
    sceneIndex: number
  ) => void
  renderSubtitlePart: (
    sceneIndex: number,
    partIndex: number | null,
    options?: { skipAnimation?: boolean; onComplete?: () => void }
  ) => void
  getActiveSegment?: (tSec: number) => {
    segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }
    segmentIndex: number
  } | null
  
  // TTS 관련
  ttsCacheRef?: React.MutableRefObject<Map<string, { durationSec: number; markup?: string; url?: string | null }>>
  voiceTemplate?: string | null
  buildSceneMarkup?: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey?: (voiceName: string, markup: string) => string
  
  // 기타
  stageDimensions: StageDimensions
  TIME_EPSILON: number
}

/**
 * Step 1 결과: 씬/파트 계산
 */
export interface Step1Result {
  sceneIndex: number
  partIndex: number | null
  sceneStartTime: number
}

/**
 * Step 2 결과: 리소스 준비
 */
export interface Step2Result {
  shouldContinue: boolean
  sprite: PIXI.Sprite | undefined
  sceneText: PIXI.Text | undefined
}

/**
 * Step 8 결과: 중복 렌더 체크
 */
export interface Step8Result {
  shouldSkip: boolean
  shouldRender: boolean
  needsRender: boolean
  sceneChanged: boolean
  previousRenderedSceneIndex: number | null
  isTransitionInProgress: boolean
  isTransitionInProgressForRender: boolean
  transitionProgress: number
  motionProgress: number
  activeSegmentFromTts: {
    segment: { id: string; sceneIndex?: number; partIndex?: number; durationSec?: number; startSec?: number }
    segmentIndex: number
  } | null
  sceneIndex: number
  partIndex: number | null
  sceneStartTime: number
}

/**
 * Step 5 결과: Motion 적용
 */
export interface Step5Result {
  motionProgress: number
  spriteAfterMotion: {
    x: number
    y: number
    scaleX: number
    scaleY: number
  } | null
  sceneLocalT: number
  sceneStartTime: number
}
