/**
 * 공통 타입 정의
 * 여러 훅에서 공통으로 사용되는 타입들을 정의합니다.
 */

import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'

/**
 * 공통 Ref 타입들
 */
export interface CommonRefs {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
}

/**
 * 스테이지 크기
 */
export interface StageDimensions {
  width: number
  height: number
}

/**
 * 편집 모드
 */
export type EditMode = 'none' | 'image' | 'text'

/**
 * 선택된 요소 타입
 */
export type SelectedElementType = 'image' | 'text' | null

/**
 * 리사이즈 핸들 방향
 */
export type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null

/**
 * Transform 정보
 */
export interface Transform {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  rotation: number
  baseWidth?: number
  baseHeight?: number
  left?: number
  right?: number
  top?: number
  bottom?: number
}

/**
 * 드래그 시작 위치
 */
export interface DragStartPos {
  x: number
  y: number
  boundsWidth?: number
  boundsHeight?: number
}

/**
 * 리사이즈 시작 위치
 */
export interface ResizeStartPos {
  x: number
  y: number
  handleX?: number
  handleY?: number
}

