/**
 * Video Analysis — ViewModel Types
 *
 * Domain Model을 UI에 맞게 파생한 타입.
 * 포맷된 문자열, UI 전용 파생 상태 등.
 */

export interface ThumbnailAnalysisViewModel {
  imageUrl: string
  mainText: string
  textRatioPercent?: string     // API에서 미제공 시 undefined
  layoutComposition?: string    // API에서 미제공 시 undefined
  colors: string[]
  ctrGrade: string
  why?: string
  evidence: string[]
  facePresence?: string
  numberEmphasis?: string
  emotionTrigger?: string
}

export interface HookAnalysisViewModel {
  durationLabel: string         // "첫 3초"
  hookDurationSecLabel: string  // "3.0 Sec"
  videoLengthLabel?: string     // "0.73 Min"
  sceneCountLabel?: string      // "4 EA"
  avgCutLengthLabel?: string    // "4.6 Sec"
  openingType: string
  emotionTrigger: string
  pacing: 'fast' | 'medium' | 'slow'
  pacingLabel: string           // "빠름" | "보통" | "느림"
  why: string
  evidence: string[]
  viewerPositioning?: string
  visualHook?: string
  firstSentence?: string
}

export interface StorySegmentViewModel {
  timeframe: string
  title: string
  description: string
}

export interface LabeledItemViewModel {
  label: string
  description: string
}

export interface TrendInsightViewModel {
  value: string
  label: string
}

export interface VideoStructureViewModel {
  overview: string
  directorComment?: string
  targetAudienceDescription: string
  targetAudienceAttributes: string[]
  storyStructure: StorySegmentViewModel[]
  viralPoints: string[]               // ViralPointCard를 표시용 문자열로 변환한 목록
  editingPoints?: LabeledItemViewModel[]
  trendContextDescription?: string
  trendInsights?: TrendInsightViewModel[]
  ctaStrategy?: LabeledItemViewModel[]
}

export interface VideoAnalysisViewModel {
  thumbnail: ThumbnailAnalysisViewModel
  hook: HookAnalysisViewModel
  structure: VideoStructureViewModel
}
