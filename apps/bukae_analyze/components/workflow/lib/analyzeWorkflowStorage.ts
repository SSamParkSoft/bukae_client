import { clearStoredPt1PlanningSnapshots } from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'
import { clearStoredFollowUpChatHistories } from '@/features/aiPlanning/lib/followUpChatbot/chatHistoryStorage'
import { clearStoredPlanningSetupAnswers } from '@/features/planningSetup/lib/planningSetupAnswerStorage'
import { clearWorkflowStepCompletions } from './workflowStepCompletionStorage'

export function clearAnalyzeWorkflowStorage(): void {
  clearStoredPlanningSetupAnswers()
  clearStoredPt1PlanningSnapshots()
  clearStoredFollowUpChatHistories()
  clearWorkflowStepCompletions()
}
