'use client'

import { useState, useCallback } from 'react'
import type { AiPlanningAnswers } from '@/lib/types/domain'

const INITIAL_ANSWERS: AiPlanningAnswers = {
  hooking: null,
  hookingCustom: '',
  storyDirection: null,
  coreMessage: null,
  coreMessageCustom: '',
  audienceReaction: null,
  cta: null,
}

export interface AiPlanningForm {
  answers: AiPlanningAnswers
  update: (partial: Partial<AiPlanningAnswers>) => void
}

export function useAiPlanningForm(): AiPlanningForm {
  const [answers, setAnswers] = useState<AiPlanningAnswers>(INITIAL_ANSWERS)

  const update = useCallback((partial: Partial<AiPlanningAnswers>) => {
    setAnswers(prev => ({ ...prev, ...partial }))
  }, [])

  return { answers, update }
}
