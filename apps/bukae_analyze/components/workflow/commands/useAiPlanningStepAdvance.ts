'use client'

import { useRouter } from 'next/navigation'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { enterPlanningWorkspace } from '@/lib/services/planning'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import type { AnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from '@/components/workflow/lib/analyzeWorkflowSteps'

export interface AiPlanningStepAdvanceState {
  canProceedAiPlanning: boolean
  isAdvancingAiPlanning: boolean
  advanceAiPlanningToNextWorkflowStep: (nextPath: string) => Promise<void>
}

export function useAiPlanningStepAdvance(
  routeState: AnalyzeWorkflowRouteState
): AiPlanningStepAdvanceState {
  const router = useRouter()
  const {
    projectId,
    planning,
    generationRequestId,
    isChatbotMode,
  } = routeState
  const canProceedAiPlanning = useAiPlanningStore((state) => state.canProceed)
  const isAdvancingAiPlanning = useAiPlanningStore((state) => state.isAdvancing)
  const aiPlanningNextTarget = useAiPlanningStore((state) => state.nextTarget)
  const planningSessionId = useAiPlanningStore((state) => state.planningSessionId)
  const briefVersionId = useAiPlanningStore((state) => state.briefVersionId)
  const answeredQuestionIds = useAiPlanningStore((state) => state.answeredQuestionIds)
  const setAdvancingAiPlanning = useAiPlanningStore((state) => state.setAdvancing)
  const setChatbotInitialSession = useAiPlanningStore((state) => state.setChatbotInitialSession)
  const getCachedChatbotSession = useAnalyzeWorkflowStore((state) => state.getCachedChatbotSession)
  const cacheChatbotSession = useAnalyzeWorkflowStore((state) => state.cacheChatbotSession)
  const getCachedGenerationRequestId = useAnalyzeWorkflowStore((state) => state.getCachedGenerationRequestId)
  const cacheGenerationRequestId = useAnalyzeWorkflowStore((state) => state.cacheGenerationRequestId)

  async function advanceAiPlanningToNextWorkflowStep(nextPath: string) {
    if (!projectId || !canProceedAiPlanning || isAdvancingAiPlanning) return

    setAdvancingAiPlanning(true)

    try {
      if (aiPlanningNextTarget === 'chatbot') {
        await enterFollowUpChatbotWorkspaceOnce()
        return
      }

      if (aiPlanningNextTarget === 'shooting-guide') {
        await startGenerationOnceAndOpenShootingGuide(nextPath)
        return
      }
    } finally {
      setAdvancingAiPlanning(false)
    }
  }

  async function enterFollowUpChatbotWorkspaceOnce() {
    if (planningSessionId) {
      const cachedSession = getCachedChatbotSession(planningSessionId)
      if (cachedSession) {
        setChatbotInitialSession(cachedSession)
      } else {
        const chatbotSession = await enterPlanningWorkspace(projectId!, {
          planningSessionId,
          answeredQuestionIds,
          answeredCount: answeredQuestionIds.length,
        }).catch(() => null)

        if (chatbotSession) {
          cacheChatbotSession(planningSessionId, chatbotSession)
          setChatbotInitialSession(chatbotSession)
        }
      }
    }

    const params = new URLSearchParams({ projectId: projectId! })
    if (planning) params.set('planning', planning)
    params.set('mode', 'chatbot')
    router.push(`/ai-planning?${params.toString()}`)
  }

  async function startGenerationOnceAndOpenShootingGuide(nextPath: string) {
    if (generationRequestId) {
      router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning, generationRequestId }))
      return
    }

    if (isChatbotMode && briefVersionId) {
      const cachedGenerationRequestId = getCachedGenerationRequestId(briefVersionId)
      const generationRequestId = cachedGenerationRequestId ?? await startGenerationAndCacheRequestId(briefVersionId)
      const params = new URLSearchParams({
        projectId: projectId!,
        generationRequestId,
      })
      if (planning) params.set('planning', planning)
      router.push(`${nextPath}?${params.toString()}`)
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, planning }))
  }

  async function startGenerationAndCacheRequestId(briefVersionId: string): Promise<string> {
    const generation = await startGenerationFromCommand(projectId!, {
      briefVersionId,
      generationMode: 'single',
      variantCount: 1,
    })
    cacheGenerationRequestId(briefVersionId, generation.generationRequestId)
    return generation.generationRequestId
  }

  return {
    canProceedAiPlanning,
    isAdvancingAiPlanning,
    advanceAiPlanningToNextWorkflowStep,
  }
}
