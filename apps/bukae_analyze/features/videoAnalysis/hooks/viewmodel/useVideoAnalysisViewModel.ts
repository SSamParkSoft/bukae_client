'use client'

import { useMemo } from 'react'
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

function formatMinutesToClock(value?: number): string | undefined {
  if (value === undefined) return undefined

  const totalSeconds = Math.round(value * 60)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatSentenceBreaks(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const sentences = trimmed
    .replace(/니다\.\s+/g, '니다.\n')
    .split('\n')
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  return sentences.length > 0 ? sentences : [trimmed]
}

function mapThumbnailViewModel(domain: VideoAnalysis): ThumbnailAnalysisViewModel {
  const why = domain.thumbnail.why

  return {
    ...domain.thumbnail,
    textRatioPercent: formatPercent(domain.thumbnail.textRatio),
    why: why?.trim() ? formatSentenceBreaks(why) : undefined,
  }
}

function mapHookViewModel(domain: VideoAnalysis): HookAnalysisViewModel {
  return {
    ...domain.hook,
    why: formatSentenceBreaks(domain.hook.why),
    durationLabel: `첫 ${domain.hook.durationSec}초`,
    hookDurationSecLabel: formatSeconds(domain.hook.durationSec) ?? '0.0 Sec',
    videoLengthLabel: formatMinutesToClock(domain.hook.videoLengthMin),
    sceneCountLabel: `${domain.structure.storyStructure.length} EA`,
    avgCutLengthLabel: formatSeconds(domain.hook.avgCutLengthSec),
    pacingLabel: PACING_LABEL[domain.hook.pacing],
  }
}

function mapStructureViewModel(domain: VideoAnalysis): VideoStructureViewModel {
  const dc = domain.structure.directorComment
  const tc = domain.structure.trendContextDescription

  return {
    ...domain.structure,
    directorComment: dc?.trim() ? formatSentenceBreaks(dc) : undefined,
    trendContextDescription: tc?.trim() ? formatSentenceBreaks(tc) : undefined,
    storyStructure: domain.structure.storyStructure.map((segment) => ({
      ...segment,
      description: formatSentenceBreaks(segment.description),
    })),
    editingPoints: domain.structure.editingPoints?.map((item) => ({
      ...item,
      description: formatSentenceBreaks(item.description),
    })),
    ctaStrategy: domain.structure.ctaStrategy?.map((item) => ({
      ...item,
      description: formatSentenceBreaks(item.description),
    })),
    viralPoints: domain.structure.viralPointCards.map(
      (point) => `${point.title}: ${point.summary}`
    ),
  }
}

export function useVideoAnalysisViewModel(domain: VideoAnalysis): VideoAnalysisViewModel {
  return useMemo(
    () => ({
      thumbnail: mapThumbnailViewModel(domain),
      hook: mapHookViewModel(domain),
      structure: mapStructureViewModel(domain),
    }),
    [domain],
  )
}
