'use client'

import type { VideoAnalysis } from '@/lib/types/domain'
import type {
  HookAnalysisViewModel,
  ThumbnailAnalysisViewModel,
  VideoAnalysisViewModel,
  VideoStructureViewModel,
} from '../../types/viewModel'

const PACING_LABEL: Record<VideoAnalysis['hook']['pacing'], string> = {
  fast: '빠름',
  medium: '보통',
  slow: '느림',
}

function formatPercent(value?: number): string | undefined {
  return value !== undefined ? `${Math.round(value * 100)}%` : undefined
}

function formatSeconds(value?: number): string | undefined {
  return value !== undefined ? `${value.toFixed(1)} Sec` : undefined
}

function formatMinutes(value?: number): string | undefined {
  return value !== undefined ? `${value.toFixed(2)} Min` : undefined
}

function mapThumbnailViewModel(domain: VideoAnalysis): ThumbnailAnalysisViewModel {
  return {
    ...domain.thumbnail,
    textRatioPercent: formatPercent(domain.thumbnail.textRatio),
  }
}

function mapHookViewModel(domain: VideoAnalysis): HookAnalysisViewModel {
  return {
    ...domain.hook,
    durationLabel: `첫 ${domain.hook.durationSec}초`,
    hookDurationSecLabel: formatSeconds(domain.hook.durationSec) ?? '0.0 Sec',
    videoLengthLabel: formatMinutes(domain.hook.videoLengthMin),
    sceneCountLabel: `${domain.structure.storyStructure.length} EA`,
    avgCutLengthLabel: formatSeconds(domain.hook.avgCutLengthSec),
    pacingLabel: PACING_LABEL[domain.hook.pacing],
  }
}

function mapStructureViewModel(domain: VideoAnalysis): VideoStructureViewModel {
  return {
    ...domain.structure,
    viralPoints: domain.structure.viralPointCards.map(
      (point) => `${point.title}: ${point.summary}`
    ),
  }
}

export function useVideoAnalysisViewModel(domain: VideoAnalysis): VideoAnalysisViewModel {
  return {
    thumbnail: mapThumbnailViewModel(domain),
    hook: mapHookViewModel(domain),
    structure: mapStructureViewModel(domain),
  }
}
