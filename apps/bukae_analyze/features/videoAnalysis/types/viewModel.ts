/**
 * Video Analysis — ViewModel Types
 *
 * Domain Model을 UI에 맞게 파생한 타입.
 * 포맷된 문자열, UI 전용 파생 상태 등.
 */

export interface CrossValidationViewModel {
  match: boolean
  evidence: string
}

export interface ThumbnailAnalysisViewModel {
  imageUrl: string
  mainText: string
  textRatioPercent: string      // "38%"
  layoutComposition: string
  colors: string[]
  ctrGrade: string
  why: string
  evidence: string[]
  crossValidation: CrossValidationViewModel
  facePresence?: string
  numberEmphasis?: string
  emotionTrigger?: string
}

export interface HookAnalysisViewModel {
  durationLabel: string         // "첫 9초"
  openingType: string
  emotionTrigger: string
  pacing: 'fast' | 'medium' | 'slow'
  pacingLabel: string           // "빠름" | "보통" | "느림"
  why: string
  evidence: string[]
  crossValidation: CrossValidationViewModel
  viewerPositioning?: string
  visualHook?: string
  firstSentence?: string
}

export interface SentimentBarViewModel {
  positivePercent: number       // 82
  negativePercent: number       // 6
  neutralPercent: number        // 12
}

export interface CommentAnalysisViewModel {
  targetAudienceSignal: string
  topThemes: string[]
  requestPatterns: string[]
  confusionPoints: string[]
  sentimentBar: SentimentBarViewModel
  keywords: string[]
  why: string
  evidence: string[]
  conversionComments?: number
}

export interface VideoStructureViewModel {
  overview: string
  storyStructure: string
  editingPoints: string
  targetAudience: string
  viralPoints: string
  trendContext: string
  ctaStrategy: string
}

export interface VideoAnalysisViewModel {
  thumbnail: ThumbnailAnalysisViewModel
  hook: HookAnalysisViewModel
  comment: CommentAnalysisViewModel
  structure: VideoStructureViewModel
}
