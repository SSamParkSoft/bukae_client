'use client'

import { useEffect } from 'react'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { createAiPlanningNavigationState } from '../../lib/navigationState'
import type { AiPlanningStage, PlanningSession } from '@/lib/types/domain'
import type { ReadyBriefViewModel } from '../../types/chatbotViewModel'

interface UseAiPlanningNavigationStateSyncParams {
  stage: AiPlanningStage
  readyBrief: ReadyBriefViewModel | null
  session: PlanningSession | null
  answeredQuestionIds: string[]
  isSavingPt1Answers: boolean
}

export function useAiPlanningNavigationStateSync({
  stage,
  readyBrief,
  session,
  answeredQuestionIds,
  isSavingPt1Answers,
}: UseAiPlanningNavigationStateSyncParams) {
  const setNavigationState = useAiPlanningStore((state) => state.setNavigationState)

  useEffect(() => {
    setNavigationState(createAiPlanningNavigationState({
      stage,
      readyBrief,
      session,
      answeredQuestionIds,
      isSavingPt1Answers,
    }))
  }, [
    answeredQuestionIds,
    isSavingPt1Answers,
    readyBrief,
    session,
    setNavigationState,
    stage,
  ])
}
