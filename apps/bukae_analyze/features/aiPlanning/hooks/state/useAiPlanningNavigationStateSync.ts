'use client'

import { useEffect } from 'react'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { createAiPlanningNavigationState } from '../../lib/navigationState'
import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'
import type { ReadyBriefViewModel } from '../../types/chatbotViewModel'

interface UseAiPlanningNavigationStateSyncParams {
  isChatbotMode: boolean
  readyBrief: ReadyBriefViewModel | null
  session: PlanningSession | null
  questions: PlanningQuestion[]
  canEnterPt2: boolean
  hasPendingSave: boolean
  hasSaveError: boolean
}

export function useAiPlanningNavigationStateSync({
  isChatbotMode,
  readyBrief,
  session,
  questions,
  canEnterPt2,
  hasPendingSave,
  hasSaveError,
}: UseAiPlanningNavigationStateSyncParams) {
  const setNavigationState = useAiPlanningStore((state) => state.setNavigationState)

  useEffect(() => {
    setNavigationState(createAiPlanningNavigationState({
      isChatbotMode,
      readyBrief,
      session,
      questions,
      canEnterPt2,
      hasPendingSave,
      hasSaveError,
    }))
  }, [
    canEnterPt2,
    hasPendingSave,
    hasSaveError,
    isChatbotMode,
    questions,
    readyBrief,
    session,
    setNavigationState,
  ])
}
