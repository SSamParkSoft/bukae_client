/**
 * Video Analysis — Domain Models
 *
 * AI가 분석한 영상 분석 결과 타입.
 */

// 썸네일 분석
export interface ThumbnailAnalysis {
  imageUrl: string
  mainText: string
  colors: string[]         // evidence에서 파싱한 hex 색상 목록
  ctrGrade: string
  why?: string
  evidence: string[]
  textRatio?: number
  layoutComposition?: string
  facePresence?: string
  numberEmphasis?: string
  emotionTrigger?: string
}

// 훅 분석
export interface HookAnalysis {
  hookRange: string                  // "0~3초" — API raw 값
  durationSec: number                // hookRange에서 파싱
  videoLengthMin?: number
  avgCutLengthSec?: number
  openingType: string
  emotionTrigger: string
  pacing: 'fast' | 'medium' | 'slow'
  why: string
  evidence: string[]
  viewerPositioning?: string
  visualHook?: string
  firstSentence?: string
}

// 스토리 씬 세그먼트
export interface StorySegment {
  timeframe: string    // "00.00s - 04.60s"
  title: string        // scene_role 번역 (훅, 문제 제기 등)
  description: string
}

// 바이럴 포인트 카드
export interface ViralPointCard {
  title: string
  summary: string
}

export interface LabeledPoint {
  label: string
  description: string
}

export interface TrendInsight {
  value: string
  label: string
}

// 영상 구조 분석
export interface VideoStructureAnalysis {
  overview: string
  directorComment?: string
  targetAudienceDescription: string
  targetAudienceAttributes: string[]
  storyStructure: StorySegment[]
  viralPointCards: ViralPointCard[]
  editingPoints?: LabeledPoint[]
  trendContextDescription?: string
  trendInsights?: TrendInsight[]
  ctaStrategy?: LabeledPoint[]
}

// 합성 타입
export interface VideoAnalysis {
  thumbnail: ThumbnailAnalysis
  hook: HookAnalysis
  structure: VideoStructureAnalysis
}
