import type { PlanningSession } from '@/lib/types/domain'
import { createFollowUpQuestionWorkflow } from '../../../lib/followUpChatbot/workflow'
import { canFinalizePlanning } from '../../../lib/planningPredicates'

export const POLLING_INTERVAL_MS = 2000
export const PLANNING_POLLING_LIMIT = 120

export function getPlanningDebugSnapshot(session: PlanningSession | null) {
  return {
    planningSessionId: session?.planningSessionId ?? null,
    planningMode: session?.planningMode ?? null,
    planningStatus: session?.planningStatus ?? null,
    readyForApproval: Boolean(session?.readyForApproval),
    readyToFinalize: canFinalizePlanning(session),
    clarifyingQuestionCount: session?.clarifyingQuestions.length ?? 0,
    answeredQuestionCount: createFollowUpQuestionWorkflow(session).answeredQuestionCount,
    firstQuestionId: session?.clarifyingQuestions[0]?.questionId ?? null,
    failureMessage: session?.failure?.summary ?? session?.failure?.message ?? null,
    projectStatus: session?.projectStatus ?? null,
    currentStep: session?.currentStep ?? null,
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
