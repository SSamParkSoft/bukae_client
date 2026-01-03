/**
 * 씬 관련 타입 정의
 */

import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import type { CommonRefs, StageDimensions } from './common'

/**
 * 씬 렌더링 옵션 (기본)
 */
export interface BaseRenderOptions {
  skipAnimation?: boolean
  forceTransition?: string
  previousIndex?: number | null
  onComplete?: () => void
}

/**
 * 씬 이미지 렌더링 옵션
 */
export interface RenderSceneImageOptions extends BaseRenderOptions {
  prepareOnly?: boolean
}

/**
 * 자막 렌더링 옵션
 */
export interface RenderSubtitlePartOptions {
  skipAnimation?: boolean
  onComplete?: () => void
  prepareOnly?: boolean
}

/**
 * 씬 콘텐츠 렌더링 옵션
 */
export interface RenderSceneContentOptions extends BaseRenderOptions {
  updateTimeline?: boolean
  prepareOnly?: boolean
  isPlaying?: boolean
  transitionDuration?: number
}

/**
 * 이미지/자막 준비 옵션
 */
export interface PrepareImageAndSubtitleOptions {
  onComplete?: () => void
}

/**
 * 전환 효과 적용 함수 타입
 */
export type ApplyEnterEffectFunction = (
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

/**
 * 씬 매니저 파라미터
 */
export interface UseSceneManagerParams extends Partial<CommonRefs> {
  // 필수 Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  
  // Fabric 관련
  fabricCanvasRef?: React.RefObject<fabric.Canvas | null>
  fabricScaleRatioRef?: React.MutableRefObject<number>
  isSavingTransformRef?: React.MutableRefObject<boolean>
  isManualSceneSelectRef?: React.MutableRefObject<boolean>
  
  // State/Props
  timeline: TimelineData | null
  stageDimensions: StageDimensions
  useFabricEditing: boolean
  
  // Functions
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  applyEnterEffect: ApplyEnterEffectFunction
  onLoadComplete?: (sceneIndex: number) => void
  
  // Optional functions
  setTimeline?: (timeline: TimelineData) => void
  setCurrentSceneIndex?: (index: number) => void
}

/**
 * 씬 렌더링 함수 타입들
 */
export type RenderSceneImageFunction = (
  sceneIndex: number,
  options?: RenderSceneImageOptions
) => void

export type RenderSubtitlePartFunction = (
  sceneIndex: number,
  partIndex: number | null,
  options?: RenderSubtitlePartOptions
) => void

export type RenderSceneContentFunction = (
  sceneIndex: number,
  partIndex?: number | null,
  options?: RenderSceneContentOptions
) => void

export type PrepareImageAndSubtitleFunction = (
  sceneIndex: number,
  partIndex?: number,
  options?: PrepareImageAndSubtitleOptions
) => void

