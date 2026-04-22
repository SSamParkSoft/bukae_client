'use client'

import { useMemo } from 'react'
import type { VideoAnalysis } from '@/lib/types/domain'
import type { VideoAnalysisViewModel } from '../../types/viewModel'

const PACING_LABEL: Record<'fast' | 'medium' | 'slow', string> = {
  fast: '빠름',
  medium: '보통',
  slow: '느림',
}

export function useVideoAnalysisViewModel(domain: VideoAnalysis): VideoAnalysisViewModel {
  return useMemo(() => ({
    thumbnail: {
      imageUrl: domain.thumbnail.imageUrl,
      mainText: domain.thumbnail.mainText,
      textRatioPercent: domain.thumbnail.textRatio !== undefined
        ? `${Math.round(domain.thumbnail.textRatio * 100)}%`
        : undefined,
      layoutComposition: domain.thumbnail.layoutComposition,
      colors: domain.thumbnail.colors,
      ctrGrade: domain.thumbnail.ctrGrade,
      why: domain.thumbnail.why,
      evidence: domain.thumbnail.evidence,
      facePresence: domain.thumbnail.facePresence,
      numberEmphasis: domain.thumbnail.numberEmphasis,
      emotionTrigger: domain.thumbnail.emotionTrigger,
    },

    hook: {
      durationLabel: `첫 ${domain.hook.durationSec}초`,
      hookDurationSecLabel: `${domain.hook.durationSec.toFixed(1)} Sec`,
      videoLengthLabel: domain.hook.videoLengthMin !== undefined
        ? `${domain.hook.videoLengthMin.toFixed(2)} Min`
        : undefined,
      sceneCountLabel: undefined,
      avgCutLengthLabel: domain.hook.avgCutLengthSec !== undefined
        ? `${domain.hook.avgCutLengthSec.toFixed(1)} Sec`
        : undefined,
      openingType: domain.hook.openingType,
      emotionTrigger: domain.hook.emotionTrigger,
      pacing: domain.hook.pacing,
      pacingLabel: PACING_LABEL[domain.hook.pacing],
      why: domain.hook.why,
      evidence: domain.hook.evidence,
      viewerPositioning: domain.hook.viewerPositioning,
      visualHook: domain.hook.visualHook,
      firstSentence: domain.hook.firstSentence,
    },

    structure: {
      overview: domain.structure.overview,
      directorComment: domain.structure.directorComment,
      targetAudienceDescription: domain.structure.targetAudienceDescription,
      targetAudienceAttributes: domain.structure.targetAudienceAttributes,
      storyStructure: domain.structure.storyStructure.map((seg) => ({
        timeframe: seg.timeframe,
        title: seg.title,
        description: seg.description,
      })),
      viralPoints: domain.structure.viralPointCards.map(
        (c) => `${c.title}: ${c.summary}`
      ),
      editingPoints: domain.structure.editingPoints?.map((p) => ({
        label: p.label,
        description: p.description,
      })),
      trendContextDescription: domain.structure.trendContextDescription,
      trendInsights: domain.structure.trendInsights?.map((t) => ({
        value: t.value,
        label: t.label,
      })),
      ctaStrategy: domain.structure.ctaStrategy?.map((c) => ({
        label: c.label,
        description: c.description,
      })),
    },
  }), [domain])
}
