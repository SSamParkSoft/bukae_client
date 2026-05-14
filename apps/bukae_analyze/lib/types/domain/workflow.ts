export type ProjectWorkflowStep =
  | 'categorySelection'
  | 'planning'
  | 'generation'
  | 'unknown'

export type ProjectWorkflowStatus =
  | 'intakeReady'
  | 'planningInProgress'
  | 'planningReady'
  | 'briefApproved'
  | 'generationCompleted'
  | 'failed'
  | 'cancelled'
  | 'unknown'

export interface ProjectWorkflow {
  step: ProjectWorkflowStep
  status: ProjectWorkflowStatus
  rawStep: string | null
  rawStatus: string | null
}

function mapProjectWorkflowStep(rawStep: string | null): ProjectWorkflowStep {
  switch (rawStep) {
    case 'CATEGORY_SELECTION':
      return 'categorySelection'
    case 'PLANNING':
      return 'planning'
    case 'GENERATION':
      return 'generation'
    default:
      return 'unknown'
  }
}

function mapProjectWorkflowStatus(rawStatus: string | null): ProjectWorkflowStatus {
  switch (rawStatus) {
    case 'INTAKE_READY':
      return 'intakeReady'
    case 'PLANNING_IN_PROGRESS':
      return 'planningInProgress'
    case 'PLANNING_READY':
      return 'planningReady'
    case 'BRIEF_APPROVED':
      return 'briefApproved'
    case 'GENERATION_COMPLETED':
      return 'generationCompleted'
    case 'FAILED':
      return 'failed'
    case 'CANCELLED':
      return 'cancelled'
    default:
      return 'unknown'
  }
}

export function createProjectWorkflow(params: {
  status: string | null
  currentStep: string | null
}): ProjectWorkflow {
  const { status, currentStep } = params

  return {
    step: mapProjectWorkflowStep(currentStep),
    status: mapProjectWorkflowStatus(status),
    rawStep: currentStep,
    rawStatus: status,
  }
}

export function isProjectPlanningWorkflow(workflow: ProjectWorkflow): boolean {
  return workflow.step === 'planning' || workflow.status === 'planningInProgress'
}

export function isProjectCategorySelectionWorkflow(workflow: ProjectWorkflow): boolean {
  return workflow.step === 'categorySelection' && workflow.status === 'intakeReady'
}

export function isProjectFinalizedForGeneration(workflow: ProjectWorkflow): boolean {
  return workflow.step === 'generation' && workflow.status === 'briefApproved'
}

export function isProjectGenerationCompleted(workflow: ProjectWorkflow): boolean {
  return workflow.status === 'generationCompleted'
}

export function isProjectFailedWorkflow(workflow: ProjectWorkflow): boolean {
  return workflow.status === 'failed' || workflow.status === 'cancelled'
}

export function formatProjectWorkflowState(workflow: ProjectWorkflow): string {
  return [
    workflow.rawStep ? `currentStep=${workflow.rawStep}` : null,
    workflow.rawStatus ? `projectStatus=${workflow.rawStatus}` : null,
  ].filter(Boolean).join(', ') || '현재 단계를 확인할 수 없습니다'
}
