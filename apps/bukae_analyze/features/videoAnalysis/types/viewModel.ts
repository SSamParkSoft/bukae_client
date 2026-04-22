import type {
  HookAnalysis,
  LabeledPoint,
  StorySegment,
  ThumbnailAnalysis,
  TrendInsight,
  VideoStructureAnalysis,
} from '@/lib/types/domain'

export interface ThumbnailAnalysisViewModel extends ThumbnailAnalysis {
  textRatioPercent?: string
}

export interface HookAnalysisViewModel extends HookAnalysis {
  durationLabel: string
  hookDurationSecLabel: string
  videoLengthLabel?: string
  sceneCountLabel: string
  avgCutLengthLabel?: string
  pacingLabel: string
}

export type StorySegmentViewModel = StorySegment

export type LabeledItemViewModel = LabeledPoint

export type TrendInsightViewModel = TrendInsight

export interface VideoStructureViewModel extends Omit<VideoStructureAnalysis, 'viralPointCards'> {
  viralPoints: string[]
}

export interface VideoAnalysisViewModel {
  thumbnail: ThumbnailAnalysisViewModel
  hook: HookAnalysisViewModel
  structure: VideoStructureViewModel
}
