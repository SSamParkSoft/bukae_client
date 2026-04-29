import {
  getFinalizedProject,
  getStepMismatchMessage,
  type FinalizedProject,
} from '../planningWorkflow'

export interface PlanningRecovery {
  finalizedProject: FinalizedProject | null
  errorMessage: string | null
}

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export async function resolvePlanningRecovery(
  projectId: string,
  error: unknown,
  fallbackMessage: string
): Promise<PlanningRecovery> {
  const finalizedProject = await getFinalizedProject(projectId).catch(() => null)
  if (finalizedProject) {
    return { finalizedProject, errorMessage: null }
  }

  const stepMismatchMessage = await getStepMismatchMessage(projectId).catch(() => null)
  return {
    finalizedProject: null,
    errorMessage: stepMismatchMessage ?? getErrorMessage(error, fallbackMessage),
  }
}
