'use client'

import { useEffect, useState, useCallback } from 'react'
import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { EMPTY_PLANNING_SETUP_ANSWERS } from '@/lib/utils/planningSetupQuery'
import {
  getStoredPlanningSetupAnswers,
  storePlanningSetupAnswers,
} from '@/features/planningSetup/lib/planningSetupAnswerStorage'

export interface PlanningSetupForm {
  answers: PlanningSetupAnswers
  update: (partial: Partial<PlanningSetupAnswers>) => void
}

export function usePlanningSetupForm(
  projectId: string,
  legacyInitialAnswers: PlanningSetupAnswers = EMPTY_PLANNING_SETUP_ANSWERS
): PlanningSetupForm {
  const [answers, setAnswers] = useState<PlanningSetupAnswers>(legacyInitialAnswers)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const storedAnswers = getStoredPlanningSetupAnswers(projectId)
      const nextAnswers = storedAnswers ?? legacyInitialAnswers

      setAnswers(nextAnswers)
      setLoadedProjectId(projectId)
      setIsLoaded(true)

      if (!storedAnswers) {
        storePlanningSetupAnswers(projectId, nextAnswers)
      }
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [legacyInitialAnswers, projectId])

  useEffect(() => {
    if (!isLoaded) return
    if (loadedProjectId !== projectId) return

    storePlanningSetupAnswers(projectId, answers)
  }, [answers, isLoaded, loadedProjectId, projectId])

  const update = useCallback((partial: Partial<PlanningSetupAnswers>) => {
    setAnswers(prev => ({ ...prev, ...partial }))
  }, [])

  return { answers, update }
}
