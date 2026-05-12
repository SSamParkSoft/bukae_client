'use client'

import { useEffect, useMemo } from 'react'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { getAnsweredPt1QuestionIds } from '@/features/aiPlanning/lib/aiPlanningStage'
import {
  isPt1PlanningSession,
  type Pt1PlanningSnapshot,
} from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'
import { useStoredPt1PlanningSnapshot } from './useStoredPt1PlanningSnapshot'

export function usePt1PlanningSession(params: {
  projectId: string
  isChatbotMode: boolean
  generationRequestId: string | null
}) {
  const {
    projectId,
    isChatbotMode,
    generationRequestId,
  } = params
  const storedPt1SnapshotState = useStoredPt1PlanningSnapshot(projectId)
  const storedPt1Snapshot = storedPt1SnapshotState.snapshot
  const cachedPlanningSession = useAnalyzeWorkflowStore((state) => state.getCachedPlanningSession(projectId))
  const cachePlanningSession = useAnalyzeWorkflowStore((state) => state.cachePlanningSession)
  const cachedPt1PlanningSession = isPt1PlanningSession(cachedPlanningSession)
    ? cachedPlanningSession
    : null
  const shouldUseStoredPt1Snapshot = !isChatbotMode && Boolean(storedPt1Snapshot)
  const planningInitialSession = shouldUseStoredPt1Snapshot
    ? storedPt1Snapshot?.session ?? null
    : cachedPt1PlanningSession ?? null
  const shouldFetchPlanningSession =
    !isChatbotMode &&
    !generationRequestId &&
    storedPt1SnapshotState.isLoaded &&
    !shouldUseStoredPt1Snapshot
  const planningSessionState = usePlanningSession(
    projectId,
    planningInitialSession,
    shouldFetchPlanningSession
  )

  useEffect(() => {
    if (!planningSessionState.session) return
    if (!isPt1PlanningSession(planningSessionState.session)) return

    cachePlanningSession(projectId, planningSessionState.session)
  }, [cachePlanningSession, planningSessionState.session, projectId])

  const displayedPlanningSession = isChatbotMode || isPt1PlanningSession(planningSessionState.session)
    ? planningSessionState.session
    : storedPt1Snapshot?.session ?? null

  const questions = useMemo(
    () => displayedPlanningSession?.clarifyingQuestions ?? [],
    [displayedPlanningSession]
  )

  const answeredPt1QuestionIds = useMemo(
    () => getAnsweredPt1QuestionIds(displayedPlanningSession),
    [displayedPlanningSession]
  )

  const isLoadingPt1Questions =
    questions.length === 0 &&
    (
      planningSessionState.isLoading ||
      (
        !isChatbotMode &&
        !isPt1PlanningSession(planningSessionState.session) &&
        !storedPt1SnapshotState.isLoaded
      ) ||
      (Boolean(generationRequestId) && !storedPt1SnapshotState.isLoaded)
    )

  return {
    planningSessionState,
    storedPt1Snapshot: storedPt1Snapshot as Pt1PlanningSnapshot | null,
    questions,
    answeredPt1QuestionIds,
    isLoadingPt1Questions,
  }
}
