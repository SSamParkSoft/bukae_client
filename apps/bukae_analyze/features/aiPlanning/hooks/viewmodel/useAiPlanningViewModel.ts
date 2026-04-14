'use client'

import { useMemo } from 'react'
import type { AiPlanningInput } from '@/lib/types/domain'
import type { AiPlanningViewModel } from '../../types/viewModel'
import type { AiPlanningForm } from '../form/useAiPlanningForm'
import {
  getHookingOptions,
  getStoryDirectionConfig,
  getCoreMessageOptions,
  AUDIENCE_REACTION_OPTIONS,
  getAudienceReactionInsight,
  getCtaOptions,
} from '../../config/categoryQuestionConfig'

export function useAiPlanningViewModel(
  input: AiPlanningInput,
  form: AiPlanningForm,
): AiPlanningViewModel {
  const { category, referenceContext } = input
  const { answers, update } = form

  return useMemo((): AiPlanningViewModel => {
    const storyConfig = getStoryDirectionConfig(category)

    return {
      hooking: {
        sectionTitle: '후킹',
        referenceInsight: `이 영상은 "${referenceContext.hookingStyleLabel}" 방식을 사용했어요. 어떤 점을 가져가고 싶으신가요?`,
        options: getHookingOptions(category),
        selected: answers.hooking,
        customValue: answers.hookingCustom,
        hasCustomOption: true,
        onSelect: (value: string) => update({ hooking: value }),
        onCustomChange: (value: string) => update({ hookingCustom: value }),
      },
      storyDirection: {
        sectionTitle: storyConfig.title,
        referenceInsight: `이 영상의 스토리 패턴은 "${referenceContext.storyPatternLabel}"이었어요. 어떤 방향으로 가고 싶으신가요?`,
        options: storyConfig.options,
        selected: answers.storyDirection,
        customValue: '',
        hasCustomOption: storyConfig.hasCustomOption,
        onSelect: (value: string) => update({ storyDirection: value }),
        onCustomChange: () => {},
      },
      coreMessage: {
        sectionTitle: '핵심 메시지',
        referenceInsight: `이 영상으로 전달하고 싶은 한 줄 메시지가 무엇인가요?`,
        options: getCoreMessageOptions(category),
        selected: answers.coreMessage,
        customValue: answers.coreMessageCustom,
        hasCustomOption: true,
        onSelect: (value: string) => update({ coreMessage: value }),
        onCustomChange: (value: string) => update({ coreMessageCustom: value }),
      },
      audienceReaction: {
        sectionTitle: '원하는 시청자 반응',
        referenceInsight: getAudienceReactionInsight(category, referenceContext),
        options: AUDIENCE_REACTION_OPTIONS,
        selected: answers.audienceReaction,
        customValue: '',
        hasCustomOption: false,
        onSelect: (value: string) => update({ audienceReaction: value }),
        onCustomChange: () => {},
      },
      cta: {
        sectionTitle: 'CTA',
        referenceInsight: `이 영상의 CTA는 "${referenceContext.ctaStyleLabel}"이었어요. 어떤 행동을 유도하고 싶으신가요?`,
        options: getCtaOptions(category),
        selected: answers.cta,
        customValue: '',
        hasCustomOption: false,
        onSelect: (value: string) => update({ cta: value }),
        onCustomChange: () => {},
      },
    }
  }, [answers, category, referenceContext, update])
}
