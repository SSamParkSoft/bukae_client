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
    setStoreAnswers(initialAnswers)
  }, [initialAnswers, setStoreAnswers])

  const update = useCallback((partial: Partial<PlanningSetupAnswers>) => {
    setAnswers(prev => {
      const next = { ...prev, ...partial }
      setStoreAnswers(next)
      return next
    })
  }, [setStoreAnswers])

  return { answers, update }
}
