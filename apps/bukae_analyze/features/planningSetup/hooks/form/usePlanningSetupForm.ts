'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { EMPTY_PLANNING_SETUP_ANSWERS } from '@/lib/utils/planningSetupQuery'
import { usePlanningStore } from '@/store/usePlanningStore'

export interface PlanningSetupForm {
  answers: PlanningSetupAnswers
  update: (partial: Partial<PlanningSetupAnswers>) => void
}

export function usePlanningSetupForm(
  initialAnswers: PlanningSetupAnswers = EMPTY_PLANNING_SETUP_ANSWERS
): PlanningSetupForm {
  const [answers, setAnswers] = useState<PlanningSetupAnswers>(initialAnswers)
  const setStoreAnswers = usePlanningStore(state => state.setAnswers)

  useEffect(() => {
    setAnswers(initialAnswers)
  }, [initialAnswers])

  useEffect(() => {
    setStoreAnswers(answers)
  }, [answers, setStoreAnswers])

  const update = useCallback((partial: Partial<PlanningSetupAnswers>) => {
    setAnswers(prev => ({ ...prev, ...partial }))
  }, [])

  return { answers, update }
}
