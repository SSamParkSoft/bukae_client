/**
 * Video Analysis — Domain Models
 *
 * AI가 분석한 영상 분석 결과 타입.
 * * 표시 필드는 AI 추정값임.
 */

export interface CrossValidation {
  match: boolean
  evidence: string
}

// 썸네일 분석
export interface ThumbnailAnalysis {
  imageUrl: string
  mainText: string
  textRatio: number           // * AI 추정 (0~1, ex. 0.38 = 38%)
  layoutComposition: string   // * AI 추정
  colors: string[]
  ctrGrade: string            // * AI 추정 (ex. "상위 15%")
  why: string
  evidence: string[]
  crossValidation: CrossValidation
  facePresence?: string
  numberEmphasis?: string
  emotionTrigger?: string
}

// 훅 분석
export interface HookAnalysis {
  durationSec: number
  videoLengthMin?: number           // 전체 영상 길이 (분)
  sceneCount?: number               // 총 씬 개수
  avgCutLengthSec?: number          // 평균 컷 길이 (초)
  openingType: string               // * AI 추정
  emotionTrigger: string            // * AI 추정
  pacing: 'fast' | 'medium' | 'slow' // * AI 추정
  why: string
  evidence: string[]
  crossValidation: CrossValidation
  viewerPositioning?: string
  visualHook?: string
  firstSentence?: string
}

// 댓글 반응 분석
export interface SentimentRatio {
  positive: number  // 0~1, 합계 1
  negative: number
  neutral: number
}

export interface CommentAnalysis {
  targetAudienceSignal: string
  topThemes: string[]
  requestPatterns: string[]
  confusionPoints: string[]
  sentimentRatio: SentimentRatio
  keywords: string[]
  why: string
  evidence: string[]
  conversionComments?: number
}

// 영상 구조 분석 — 서브 타입
export interface StorySegment {
  timeframe: string    // "0~9초"
  title: string        // "훅"
  description: string
}

export interface LabeledPoint {
  label: string        // "컷", "링크" 등
  description: string
}

export interface TrendInsight {
  value: string        // "+40%"
  label: string        // '"가성비" 키워드 검색량'
}

// 영상 구조 분석
export interface VideoStructureAnalysis {
  overview: string
  targetAudienceDescription: string
  targetAudienceAttributes: string[]
  storyStructure: StorySegment[]
  editingPoints: LabeledPoint[]
  viralPoints: string[]
  trendContextDescription: string
  trendInsights: TrendInsight[]
  ctaStrategy: LabeledPoint[]
}

// 합성 타입
export interface VideoAnalysis {
  thumbnail: ThumbnailAnalysis
  hook: HookAnalysis
  comment: CommentAnalysis
  structure: VideoStructureAnalysis
}
