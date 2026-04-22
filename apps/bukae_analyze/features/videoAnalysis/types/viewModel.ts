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

export interface StorySegmentViewModel extends Omit<StorySegment, 'description'> {
  description: string[]
}

export interface LabeledItemViewModel extends Omit<LabeledPoint, 'description'> {
  description: string[]
}

export type TrendInsightViewModel = TrendInsight

export interface VideoStructureViewModel
  extends Omit<
    VideoStructureAnalysis,
    | 'viralPointCards'
    | 'directorComment'
    | 'trendContextDescription'
    | 'storyStructure'
    | 'editingPoints'
    | 'ctaStrategy'
  > {
  viralPoints: string[]
  directorComment?: string[]
  trendContextDescription?: string[]
  storyStructure: StorySegmentViewModel[]
  editingPoints?: LabeledItemViewModel[]
  ctaStrategy?: LabeledItemViewModel[]
}

export interface VideoAnalysisViewModel {
  thumbnail: ThumbnailAnalysisViewModel
  hook: HookAnalysisViewModel
  structure: VideoStructureViewModel
}
