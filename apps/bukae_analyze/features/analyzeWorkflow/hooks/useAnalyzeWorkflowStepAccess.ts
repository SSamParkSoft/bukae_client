'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import {
  getPlanningSetupAnswerSnapshot,
  subscribePlanningSetupAnswerChanges,
} from '@/features/planningSetup/lib/planningSetupAnswerStorage'
import {
  getMaxAccessibleStepIndex,
  hasCompletedStep,
  migrateIntakeSubmissionStorage,
  subscribeWorkflowStepCompletionChanges,
} from '@/lib/storage/workflowStepCompletionStorage'
import type { AnalyzeWorkflowRouteState } from './useAnalyzeWorkflowRouteState'

export interface AnalyzeWorkflowStepAccessState {
  isAnalysisComplete: boolean
  isPlanningSetupComplete: boolean
  isAiPlanningComplete: boolean
  canOpenPreviousStep: boolean
  canOpenNextStep: boolean
  canOpenStepIndex: (stepIndex: number) => boolean
}

export function useAnalyzeWorkflowStepAccess(
  routeState: AnalyzeWorkflowRouteState
): AnalyzeWorkflowStepAccessState {
  const {
    projectId,
    generationRequestId,
    currentStepIndex,
    isAnalysisStep,
    isPlanningSetupStep,
    isAiPlanningStep,
    isChatbotMode,
  } = routeState
  const isSubmittingPlanningSetup = usePlanningStore((state) => state.isSubmitting)
  const planningAnswers = useSyncExternalStore(
    subscribePlanningSetupAnswerChanges,
    () => projectId ? getPlanningSetupAnswerSnapshot(projectId) : getPlanningSetupAnswerSnapshot(''),
    () => getPlanningSetupAnswerSnapshot('')
  )
  const hasCompletedAnalysis = useSyncExternalStore(
    subscribeWorkflowStepCompletionChanges,
    () => projectId ? hasCompletedStep(projectId, 'benchmark-analysis') : false,
    () => false
  )
  const canProceedAiPlanning = useAiPlanningStore((state) => state.canProceed)
  const isAdvancingAiPlanning = useAiPlanningStore((state) => state.isAdvancing)
  const aiPlanningNextTarget = useAiPlanningStore((state) => state.nextTarget)
  const maxAccessible = useSyncExternalStore(
    subscribeWorkflowStepCompletionChanges,
    () => projectId ? getMaxAccessibleStepIndex(projectId) : 0,
    () => 0
  )

  useEffect(() => {
    if (!projectId) return

    migrateIntakeSubmissionStorage(projectId)
  }, [projectId])

  return useMemo(() => {
    const hasProject = Boolean(projectId)
    const isAnalysisComplete = hasProject && (
      currentStepIndex > 0 ||
      (isAnalysisStep && hasCompletedAnalysis)
    )
    const isPlanningSetupComplete = hasProject && (
      currentStepIndex > 1 ||
      (isPlanningSetupStep && validatePlanningSetupAnswers(planningAnswers) === null)
    )
    const isAiPlanningComplete = hasProject && (
      currentStepIndex > 2 ||
      (isAiPlanningStep && (
        Boolean(generationRequestId) ||
        (canProceedAiPlanning && aiPlanningNextTarget === 'shooting-guide')
      ))
    )

    const canProceedFromCurrentStep =
      (isAnalysisStep && isAnalysisComplete) ||
      (isPlanningSetupStep && isPlanningSetupComplete && !isSubmittingPlanningSetup) ||
      (isAiPlanningStep && !isAdvancingAiPlanning && (canProceedAiPlanning || Boolean(generationRequestId)))

    const canOpenStepIndex = (stepIndex: number) => {
      if (stepIndex === currentStepIndex) return true
      if (isChatbotMode) return false
      return stepIndex <= maxAccessible
    }
    const canOpenPreviousStep = !isChatbotMode && currentStepIndex > 0 && canOpenStepIndex(currentStepIndex - 1)
    const canOpenNextStep = canProceedFromCurrentStep

    return {
      isAnalysisComplete,
      isPlanningSetupComplete,
      isAiPlanningComplete,
      canOpenPreviousStep,
      canOpenNextStep,
      canOpenStepIndex,
    }
  }, [
    aiPlanningNextTarget,
    canProceedAiPlanning,
    currentStepIndex,
    generationRequestId,
    hasCompletedAnalysis,
    isAdvancingAiPlanning,
    isAiPlanningStep,
    isAnalysisStep,
    isChatbotMode,
    isPlanningSetupStep,
    isSubmittingPlanningSetup,
    maxAccessible,
    planningAnswers,
    projectId,
  ])
}
