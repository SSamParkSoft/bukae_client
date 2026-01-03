/**
 * Timeline 도메인 모델
 * 비디오 타임라인 데이터 구조를 정의합니다.
 */

/**
 * 이미지 표시 방식
 */
export type ImageFit = 'cover' | 'contain' | 'fill'

/**
 * 텍스트 정렬 방식
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * 이미지 Transform 정보
 */
export interface ImageTransform {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  rotation: number
  baseWidth?: number // 원본 이미지 너비 (scale 제거)
  baseHeight?: number // 원본 이미지 높이 (scale 제거)
}

/**
 * 텍스트 Transform 정보
 */
export interface TextTransform {
  x: number
  y: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  rotation: number
  baseWidth?: number // 원본 텍스트 너비 (scale 제거)
  baseHeight?: number // 원본 텍스트 높이 (scale 제거)
}

/**
 * 텍스트 스타일
 */
export interface TextStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: TextAlign
}

/**
 * 고급 효과 설정
 */
export interface AdvancedEffects {
  glow?: {
    enabled: boolean
    distance?: number // 후광 거리
    outerStrength?: number // 외부 강도
    innerStrength?: number // 내부 강도
    color?: number // 색상 (hex)
  }
  particles?: {
    enabled: boolean
    type?: 'sparkle' | 'snow' | 'confetti' | 'stars' // 파티클 타입
    count?: number // 파티클 개수
    duration?: number // 지속 시간
  }
  glitch?: {
    enabled: boolean
    intensity?: number // 글리치 강도
  }
}

/**
 * 텍스트 설정
 */
export interface TextSettings {
  content: string
  font: string
  fontWeight?: number
  color: string
  position?: string
  fontSize?: number
  transform?: TextTransform
  style?: TextStyle
}

/**
 * Timeline Scene
 * 타임라인의 개별 씬을 나타냅니다.
 */
export interface TimelineScene {
  sceneId: number
  duration: number
  transition: string
  transitionDuration?: number // 전환 시간 (초), 기본값 0.5
  image: string // base64 또는 URL
  imageFit?: ImageFit // 이미지 표시 방식
  splitIndex?: number // 씬 분할 시 하위 번호 (1, 2, 3...), 있으면 독립적인 씬으로 처리
  imageTransform?: ImageTransform
  advancedEffects?: AdvancedEffects
  text: TextSettings
}

/**
 * Timeline 데이터
 * 전체 비디오 타임라인을 나타냅니다.
 */
export interface TimelineData {
  fps: number
  resolution: string
  scenes: TimelineScene[]
  playbackSpeed?: number // 전체 영상 재생 배속 (기본값 1.0)
}

