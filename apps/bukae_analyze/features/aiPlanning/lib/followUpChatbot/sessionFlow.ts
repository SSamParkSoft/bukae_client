import type { PlanningSession } from '@/lib/types/domain'
import type { ChatMessage, ReadyBriefViewModel } from '../../types/chatbotViewModel'
import { createReadyBriefViewModel } from './messages'
import { createFollowUpQuestionWorkflow } from './workflow'
import type { FinalizedProject } from '../planningWorkflow'

export type { ActiveFollowUpQuestion } from './questions'
export { mapSessionQuestions as mapFollowUpSessionQuestions } from './questions'
export { mapCurrentQuestion as mapFollowUpCurrentQuestion } from './messages'

export function getFollowUpTranscriptMessages(session: PlanningSession | null): ChatMessage[] {
  return createFollowUpQuestionWorkflow(session).transcriptMessages
}

export function createFinalizedReadyBriefViewModel(
  finalizedProject: FinalizedProject
): ReadyBriefViewModel {
  return createReadyBriefViewModel(finalizedProject)
}
