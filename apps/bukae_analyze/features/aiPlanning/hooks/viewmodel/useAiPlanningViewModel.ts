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

    const hooking: AiPlanningViewModel['hooking'] = {
      questionNumber: 'Q1',
      questionText: '이 영상의 시작 방식 중 어떤 점을 가져가고 싶으신가요?',
      customPlaceholder: '강조하고 싶은 후킹 방식을 입력해 주세요.',
      sectionTitle: '후킹',
      referenceInsight: `이 영상은 "${referenceContext.hookingStyleLabel}" 방식을 사용했어요. 어떤 점을 가져가고 싶으신가요?`,
      options: getHookingOptions(category),
      selected: answers.hooking,
      customValue: answers.hookingCustom,
      hasCustomOption: true,
      onSelect: (value: string) => update({ hooking: value }),
      onCustomChange: (value: string) => update({ hookingCustom: value }),
    }

    const storyDirection: AiPlanningViewModel['storyDirection'] = {
      questionNumber: 'Q2',
      questionText: `어떤 ${storyConfig.title}으로 가고 싶으신가요?`,
      customPlaceholder: '강조하고 싶은 방향을 입력해 주세요.',
      sectionTitle: storyConfig.title,
      referenceInsight: `이 영상의 스토리 패턴은 "${referenceContext.storyPatternLabel}"이었어요. 어떤 방향으로 가고 싶으신가요?`,
      options: storyConfig.options,
      selected: answers.storyDirection,
      customValue: '',
      hasCustomOption: storyConfig.hasCustomOption,
      onSelect: (value: string) => update({ storyDirection: value }),
      onCustomChange: () => {},
    }

    const coreMessage: AiPlanningViewModel['coreMessage'] = {
      questionNumber: 'Q3',
      questionText: '이 영상으로 전달하고 싶은 한 줄 메시지가 뭔가요?',
      customPlaceholder: '전달하고 싶은 메시지를 직접 입력해 주세요.',
      sectionTitle: '핵심 메시지',
      referenceInsight: `이 영상으로 전달하고 싶은 한 줄 메시지가 무엇인가요?`,
      options: getCoreMessageOptions(category),
      selected: answers.coreMessage,
      customValue: answers.coreMessageCustom,
      hasCustomOption: true,
      onSelect: (value: string) => update({ coreMessage: value }),
      onCustomChange: (value: string) => update({ coreMessageCustom: value }),
    }

    const audienceReaction: AiPlanningViewModel['audienceReaction'] = {
      questionNumber: 'Q4',
      questionText: '어떤 반응을 노리고 싶으신가요?',
      customPlaceholder: '원하는 반응을 직접 입력해 주세요.',
      sectionTitle: '원하는 시청자 반응',
      referenceInsight: getAudienceReactionInsight(category, referenceContext),
      options: AUDIENCE_REACTION_OPTIONS,
      selected: answers.audienceReaction,
      customValue: '',
      hasCustomOption: false,
      onSelect: (value: string) => update({ audienceReaction: value }),
      onCustomChange: () => {},
    }

    const cta: AiPlanningViewModel['cta'] = {
      questionNumber: 'Q5',
      questionText: '시청자에게 어떤 행동을 유도하고 싶으신가요?',
      customPlaceholder: '유도하고 싶은 행동을 직접 입력해 주세요.',
      sectionTitle: 'CTA',
      referenceInsight: `이 영상의 CTA는 "${referenceContext.ctaStyleLabel}"이었어요. 어떤 행동을 유도하고 싶으신가요?`,
      options: getCtaOptions(category),
      selected: answers.cta,
      customValue: '',
      hasCustomOption: false,
      onSelect: (value: string) => update({ cta: value }),
      onCustomChange: () => {},
    }

    return {
      questions: [hooking, storyDirection, coreMessage, audienceReaction, cta],
      hooking,
      storyDirection,
      coreMessage,
      audienceReaction,
      cta,
    }
  }, [answers, category, referenceContext, update])
}
