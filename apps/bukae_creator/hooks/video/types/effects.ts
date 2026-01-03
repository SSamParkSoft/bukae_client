/**
 * 효과 관련 타입 정의
 */

import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import type { StageDimensions } from './common'

/**
 * Pixi Effects 파라미터
 */
export interface UsePixiEffectsParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  stageDimensions: StageDimensions
  timeline: TimelineData | null
  playbackSpeed?: number
  onAnimationComplete?: (sceneIndex: number) => void
  isPlayingRef?: React.MutableRefObject<boolean>
}

/**
 * 전환 효과 타입
 */
export type TransitionEffect = 
  | 'none'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate'
  | 'blur'
  | 'glitch'
  | 'ripple'
  | 'circle'
  | 'wave'
  | 'circular'

/**
 * 움직임 효과 목록 (그룹 내 전환 효과 지속 대상)
 */
export const MOVEMENT_EFFECTS: TransitionEffect[] = [
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out'
]

/**
 * 전환 효과 적용 옵션
 */
export interface ApplyEffectOptions {
  forceTransition?: string
  onComplete?: (toText?: PIXI.Text | null) => void
  previousIndex?: number | null
  groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  sceneId?: number
  isPlaying?: boolean
}

