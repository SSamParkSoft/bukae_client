'use client'

import { useState, useCallback } from 'react'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { usePlanningStore } from '@/store/usePlanningStore'

const INITIAL_ANSWERS: PlanningSetupAnswers = {
  category: null,
  categoryCustom: '',
  faceExposure: null,
  faceExposureCustom: '',
  videoLength: null,
  videoLengthCustom: '',
  shooting: null,
  shootingEnvironment: '',
  coreMaterial: '',
}

export interface PlanningSetupForm {
  answers: PlanningSetupAnswers
  update: (partial: Partial<PlanningSetupAnswers>) => void
}

export function usePlanningSetupForm(): PlanningSetupForm {
  const [answers, setAnswers] = useState<PlanningSetupAnswers>(INITIAL_ANSWERS)
  const setStoreAnswers = usePlanningStore(state => state.setAnswers)

  const update = useCallback((partial: Partial<PlanningSetupAnswers>) => {
    setAnswers(prev => {
      const next = { ...prev, ...partial }
      setStoreAnswers(next)
      return next
    })
  }, [setStoreAnswers])

  return { answers, update }
}
