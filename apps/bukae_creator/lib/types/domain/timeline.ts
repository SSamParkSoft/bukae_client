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
 * ANIMATION.md 표준: 박스(TextBox) + 정렬(Align) 규칙
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
  anchor?: { x: number; y: number } // 박스 내 기준점 위치 (0..1), 기본값: { x: 0.5, y: 0.5 }
  hAlign?: 'left' | 'center' | 'right' // 가로 정렬, 기본값: 'center'
  vAlign?: 'middle' // 세로 정렬, 기본값: 'middle' (서버와 동일)
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
 * 구간 정보 (씬 내 자막 구간)
 */
export interface ScenePart {
  startTime: number // 구간의 시작 시간 (초)
  endTime: number // 구간의 끝 시간 (초)
}

/**
 * Motion 설정 (ANIMATION.md 표준)
 * motion/types.ts의 MotionConfig와 동일한 구조
 */
export interface MotionConfig {
  type: 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'rotate' | 'fade'
  startSecInScene: number // 씬 내 시작 시간 (초)
  durationSec: number // 지속 시간 (초)
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'ease-out-cubic' | 'ease-in-cubic'
  params: {
    // 슬라이드 방향 및 거리
    direction?: 'left' | 'right' | 'up' | 'down'
    distance?: number // 픽셀
    
    // 확대/축소 비율
    scaleFrom?: number
    scaleTo?: number
    
    // 회전 각도 (도 단위)
    rotationFrom?: number
    rotationTo?: number
    
    // 페이드
    alphaFrom?: number
    alphaTo?: number
  }
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
  actualPlaybackDuration?: number // 실제 재생 시간 (초), 재생 완료 후 저장됨
  startTime?: number // 씬의 시작 시간 (초) - 카드에 저장된 값
  endTime?: number // 씬의 끝 시간 (초) - 카드에 저장된 값
  parts?: ScenePart[] // 구간별 시작/끝 시간 정보
  image: string // base64 또는 URL
  imageFit?: ImageFit // 이미지 표시 방식
  splitIndex?: number // 씬 분할 시 하위 번호 (1, 2, 3...), 있으면 독립적인 씬으로 처리
  imageTransform?: ImageTransform
  advancedEffects?: AdvancedEffects
  text: TextSettings
  soundEffect?: string | null
  voiceTemplate?: string | null // 씬별 TTS 목소리 템플릿 (없으면 전역 voiceTemplate 사용)
  motion?: MotionConfig // Motion(이미지 움직임) 설정 (ANIMATION.md 표준)
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

