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
  openingType: string                      // * AI 추정
  emotionTrigger: string                   // * AI 추정
  pacing: 'fast' | 'medium' | 'slow'      // * AI 추정
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

// 영상 구조 분석
export interface VideoStructureAnalysis {
  overview: string
  storyStructure: string
  editingPoints: string
  targetAudience: string
  viralPoints: string
  trendContext: string
  ctaStrategy: string
}

// 합성 타입
export interface VideoAnalysis {
  thumbnail: ThumbnailAnalysis
  hook: HookAnalysis
  comment: CommentAnalysis
  structure: VideoStructureAnalysis
}
