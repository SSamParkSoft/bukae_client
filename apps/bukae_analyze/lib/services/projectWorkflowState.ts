import { getProjectPollingState } from './projects'

export interface ProjectWorkflowState {
  projectStatus: string | null
  currentStep: string | null
}

export async function getProjectWorkflowState(
  projectId: string
): Promise<ProjectWorkflowState> {
  const project = await getProjectPollingState(projectId)

  return {
    projectStatus: project.projectStatus,
    currentStep: project.currentStep,
  }
}

export function isPlanningStep(state: ProjectWorkflowState): boolean {
  return state.currentStep === 'PLANNING' || state.projectStatus === 'PLANNING_IN_PROGRESS'
}

export function formatWorkflowState(state: ProjectWorkflowState): string {
  return [
    state.currentStep ? `currentStep=${state.currentStep}` : null,
    state.projectStatus ? `projectStatus=${state.projectStatus}` : null,
  ].filter(Boolean).join(', ') || '현재 단계를 확인할 수 없습니다'
}
