'use client'

import { useRouter } from 'next/navigation'
import { createAppError, resolveAppError } from '@/lib/errors/appError'
import { enterPlanningWorkspace, getPlanningSession } from '@/lib/services/planning'
import { startGenerationFromCommand } from '@/lib/services/generations'
import { hasPlanningWorkspaceEntryMessage } from '@/features/aiPlanning/lib/planningPredicates'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { markWorkflowStepCompleted } from '@/lib/storage/workflowStepCompletionStorage'
import type { AnalyzeWorkflowRouteState } from '@/features/analyzeWorkflow/hooks/useAnalyzeWorkflowRouteState'
import { buildAnalyzeWorkflowStepPath } from '@/features/analyzeWorkflow/lib/analyzeWorkflowSteps'
import { storeGenerationRequestId } from '@/lib/storage/generationRequestStorage'
import type { PlanningSession } from '@/lib/types/domain'

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
  const setAdvanceError = useAiPlanningStore((state) => state.setAdvanceError)
  const setChatbotInitialSession = useAiPlanningStore((state) => state.setChatbotInitialSession)
  const getCachedChatbotSession = useAnalyzeWorkflowStore((state) => state.getCachedChatbotSession)
  const cacheChatbotSession = useAnalyzeWorkflowStore((state) => state.cacheChatbotSession)
  const getCachedGenerationRequestId = useAnalyzeWorkflowStore((state) => state.getCachedGenerationRequestId)
  const cacheGenerationRequestId = useAnalyzeWorkflowStore((state) => state.cacheGenerationRequestId)

  async function advanceAiPlanningToNextWorkflowStep(nextPath: string) {
    if (!projectId || isAdvancingAiPlanning) return
    if (!canProceedAiPlanning && !generationRequestId) return

    setAdvancingAiPlanning(true)
    setAdvanceError(null)

    try {
      if (generationRequestId) {
        await startGenerationOnceAndOpenShootingGuide(nextPath)
        return
      }

      if (aiPlanningNextTarget === 'chatbot') {
        await enterFollowUpChatbotWorkspaceOnce()
        return
      }

      if (aiPlanningNextTarget === 'shooting-guide') {
        await startGenerationOnceAndOpenShootingGuide(nextPath)
        return
      }
    } catch (error) {
      setAdvanceError(resolveAppError(
        error,
        aiPlanningNextTarget === 'chatbot'
          ? 'planning_workspace_entry'
          : 'generation_start'
      ))
    } finally {
      setAdvancingAiPlanning(false)
    }
  }

  function shouldSubmitWorkspaceEntry(session: PlanningSession): boolean {
    const planningMode = session.planningMode?.toLowerCase() ?? ''

    return (
      session.planningSessionId === planningSessionId &&
      planningMode.includes('pt1') &&
      !session.readyForApproval &&
      !hasPlanningWorkspaceEntryMessage(session)
    )
  }

  async function getLatestPlanningSessionOrNull(): Promise<PlanningSession | null> {
    return getPlanningSession(projectId!).catch(() => null)
  }

  function applyChatbotSession(session: PlanningSession | null) {
    if (!session) return

    const nextPlanningSessionId = session.planningSessionId ?? planningSessionId
    if (nextPlanningSessionId) {
      cacheChatbotSession(nextPlanningSessionId, session)
    }
    setChatbotInitialSession(session)
  }

  async function enterFollowUpChatbotWorkspaceOnce() {
    if (planningSessionId) {
      const cachedSession = getCachedChatbotSession(planningSessionId)
      if (cachedSession) {
        setChatbotInitialSession(cachedSession)
      } else {
        const latestSession = await getLatestPlanningSessionOrNull()
        if (latestSession && !shouldSubmitWorkspaceEntry(latestSession)) {
          applyChatbotSession(latestSession)
        } else {
          let workspaceEntryError: unknown = null
          const chatbotSession = await enterPlanningWorkspace(projectId!, {
            planningSessionId,
            answeredQuestionIds,
            answeredCount: answeredQuestionIds.length,
          }).catch((error) => {
            workspaceEntryError = error
            return null
          })
          const recoveredSession = chatbotSession ?? await getLatestPlanningSessionOrNull()

          applyChatbotSession(recoveredSession)
          if (!recoveredSession && workspaceEntryError) {
            throw workspaceEntryError
          }
        }
      }
    }

    if (!useAiPlanningStore.getState().chatbotInitialSession) {
      throw new Error('후속 질문 세션을 준비하지 못했습니다.')
    }

    const params = new URLSearchParams({ projectId: projectId! })
    params.set('mode', 'chatbot')
    markWorkflowStepCompleted(projectId!, 'planning')
    router.push(`/ai-planning?${params.toString()}`)
  }

  async function startGenerationOnceAndOpenShootingGuide(nextPath: string) {
    if (generationRequestId) {
      storeGenerationRequestId(projectId!, generationRequestId)
      markWorkflowStepCompleted(projectId!, 'generation')
      router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId, generationRequestId }))
      return
    }

    if (isChatbotMode) {
      const activeBriefVersionId = briefVersionId?.trim() || null

      if (activeBriefVersionId) {
        const cachedGenerationRequestId = getCachedGenerationRequestId(activeBriefVersionId)
        if (cachedGenerationRequestId) {
          storeGenerationRequestId(projectId, cachedGenerationRequestId)
          markWorkflowStepCompleted(projectId!, 'generation')
          router.push(buildAnalyzeWorkflowStepPath(nextPath, {
            projectId,
            generationRequestId: cachedGenerationRequestId,
          }))
        } else {
          const generation = await startGenerationFromCommand(projectId!, {
            briefVersionId: activeBriefVersionId,
            generationMode: 'single',
            variantCount: 1,
          })
          cacheGenerationRequestId(activeBriefVersionId, generation.generationRequestId)
          storeGenerationRequestId(projectId, generation.generationRequestId)
          markWorkflowStepCompleted(projectId!, 'generation')
          router.push(buildAnalyzeWorkflowStepPath(nextPath, {
            projectId,
            generationRequestId: generation.generationRequestId,
          }))
        }
        return
      }

      setAdvanceError(createAppError('invalid_project_state', 'generation_start'))
      return
    }

    router.push(buildAnalyzeWorkflowStepPath(nextPath, { projectId }))
  }

  return {
    canProceedAiPlanning,
    isAdvancingAiPlanning,
    advanceAiPlanningToNextWorkflowStep,
  }
}
