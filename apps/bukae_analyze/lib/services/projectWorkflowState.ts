import { getProjectPollingState } from './projects'
import {
  formatProjectWorkflowState,
  isProjectPlanningWorkflow,
  type ProjectWorkflow,
} from '@/lib/types/domain'

export type ProjectWorkflowState = ProjectWorkflow

export async function getProjectWorkflowState(
  projectId: string
): Promise<ProjectWorkflowState> {
  const project = await getProjectPollingState(projectId)

  return project.workflow
}

export function isPlanningStep(state: ProjectWorkflowState): boolean {
  return isProjectPlanningWorkflow(state)
}

export function formatWorkflowState(state: ProjectWorkflowState): string {
  return formatProjectWorkflowState(state)
}
