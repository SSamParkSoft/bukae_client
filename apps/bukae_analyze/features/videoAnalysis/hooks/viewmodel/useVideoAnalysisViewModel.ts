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
      textRatioPercent: `${Math.round(domain.thumbnail.textRatio * 100)}%`,
      layoutComposition: domain.thumbnail.layoutComposition,
      colors: domain.thumbnail.colors,
      ctrGrade: domain.thumbnail.ctrGrade,
      why: domain.thumbnail.why,
      evidence: domain.thumbnail.evidence,
      crossValidation: domain.thumbnail.crossValidation,
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
      sceneCountLabel: domain.hook.sceneCount !== undefined
        ? `${domain.hook.sceneCount} EA`
        : undefined,
      avgCutLengthLabel: domain.hook.avgCutLengthSec !== undefined
        ? `${domain.hook.avgCutLengthSec.toFixed(1)} Sec`
        : undefined,
      openingType: domain.hook.openingType,
      emotionTrigger: domain.hook.emotionTrigger,
      pacing: domain.hook.pacing,
      pacingLabel: PACING_LABEL[domain.hook.pacing],
      why: domain.hook.why,
      evidence: domain.hook.evidence,
      crossValidation: domain.hook.crossValidation,
      viewerPositioning: domain.hook.viewerPositioning,
      visualHook: domain.hook.visualHook,
      firstSentence: domain.hook.firstSentence,
    },

    comment: {
      targetAudienceSignal: domain.comment.targetAudienceSignal,
      topThemes: domain.comment.topThemes,
      requestPatterns: domain.comment.requestPatterns,
      confusionPoints: domain.comment.confusionPoints,
      sentimentBar: {
        positivePercent: Math.round(domain.comment.sentimentRatio.positive * 100),
        negativePercent: Math.round(domain.comment.sentimentRatio.negative * 100),
        neutralPercent: Math.round(domain.comment.sentimentRatio.neutral * 100),
      },
      keywords: domain.comment.keywords,
      why: domain.comment.why,
      evidence: domain.comment.evidence,
      conversionComments: domain.comment.conversionComments,
    },

    structure: {
      overview: domain.structure.overview,
      directorComment: domain.structure.directorComment,
      targetAudienceDescription: domain.structure.targetAudienceDescription,
      targetAudienceAttributes: domain.structure.targetAudienceAttributes,
      storyStructure: domain.structure.storyStructure,
      editingPoints: domain.structure.editingPoints,
      viralPoints: domain.structure.viralPoints,
      trendContextDescription: domain.structure.trendContextDescription,
      trendInsights: domain.structure.trendInsights,
      ctaStrategy: domain.structure.ctaStrategy,
    },
  }), [domain])
}
