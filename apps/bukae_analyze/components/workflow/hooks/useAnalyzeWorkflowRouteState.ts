'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { usePlanningStore } from '@/store/usePlanningStore'
import {
  ANALYZE_WORKFLOW_STEPS,
  getAnalyzeWorkflowStepIndex,
  type AnalyzeWorkflowStep,
} from '@/components/workflow/lib/analyzeWorkflowSteps'

export interface AnalyzeWorkflowRouteState {
  pathname: string
  projectId: string | null
  planning: string | null
  generationRequestId: string | null
  mode: string | null
  currentStepIndex: number
  currentStep: AnalyzeWorkflowStep | null
  previousStep: AnalyzeWorkflowStep | null
  nextStep: AnalyzeWorkflowStep | null
  isHomePage: boolean
  isFirstStep: boolean
  isLastStep: boolean
  isAnalysisStep: boolean
  isPlanningSetupStep: boolean
  isAiPlanningStep: boolean
  isChatbotMode: boolean
}

export function useAnalyzeWorkflowRouteState(): AnalyzeWorkflowRouteState {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const generationRequestId = searchParams.get('generationRequestId')
  const planningFromQuery = searchParams.get('planning')
  const mode = searchParams.get('mode')
  const planningAnswers = usePlanningStore((state) => state.answers)
  const currentStepIndex = getAnalyzeWorkflowStepIndex(pathname)
  const currentStep = ANALYZE_WORKFLOW_STEPS[currentStepIndex] ?? null
  const previousStep = ANALYZE_WORKFLOW_STEPS[currentStepIndex - 1] ?? null
  const nextStep = ANALYZE_WORKFLOW_STEPS[currentStepIndex + 1] ?? null
  const isHomePage = pathname === '/'
  const isAnalysisStep = pathname.startsWith('/analysis')
  const isPlanningSetupStep = pathname.startsWith('/planning-setup')
  const isAiPlanningStep = pathname.startsWith('/ai-planning')
  const planning = planningFromQuery ?? (
    isPlanningSetupStep
      ? serializePlanningSetupAnswers(planningAnswers)
      : null
  )

  return {
    pathname,
    projectId,
    planning,
    generationRequestId,
    mode,
    currentStepIndex,
    currentStep,
    previousStep,
    nextStep,
    isHomePage,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === ANALYZE_WORKFLOW_STEPS.length - 1,
    isAnalysisStep,
    isPlanningSetupStep,
    isAiPlanningStep,
    isChatbotMode: mode === 'chatbot',
  }
}
