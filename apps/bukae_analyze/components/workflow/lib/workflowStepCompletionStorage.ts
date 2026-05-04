const STEP_COMPLETION_ORDER = [
  'benchmark-analysis',
  'intake',
  'planning',
  'generation',
] as const

export type WorkflowStepCompletion = (typeof STEP_COMPLETION_ORDER)[number]

const STORAGE_PREFIX = 'bukae_analyze:workflow-step:'
const INTAKE_SUBMISSION_STORAGE_PREFIX = 'bukae_analyze:intake-submitted:'
const WORKFLOW_STEP_COMPLETION_CHANGE_EVENT = 'bukae_analyze:workflow-step-change'

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

function getIntakeSubmissionStorageKey(projectId: string): string {
  return `${INTAKE_SUBMISSION_STORAGE_PREFIX}${projectId}`
}

function getStepIndex(step: WorkflowStepCompletion): number {
  return STEP_COMPLETION_ORDER.indexOf(step)
}

function emitWorkflowStepCompletionChange(): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(WORKFLOW_STEP_COMPLETION_CHANGE_EVENT))
}

export function subscribeWorkflowStepCompletionChanges(
  onStoreChange: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key?.startsWith(STORAGE_PREFIX) ||
      event.key?.startsWith(INTAKE_SUBMISSION_STORAGE_PREFIX)
    ) {
      onStoreChange()
    }
  }

  window.addEventListener(WORKFLOW_STEP_COMPLETION_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(WORKFLOW_STEP_COMPLETION_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
}

export function getStoredWorkflowStep(projectId: string): WorkflowStepCompletion | null {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(getStorageKey(projectId))
    if (value && (STEP_COMPLETION_ORDER as readonly string[]).includes(value)) {
      return value as WorkflowStepCompletion
    }

    if (window.localStorage.getItem(getIntakeSubmissionStorageKey(projectId)) === '1') {
      window.localStorage.setItem(getStorageKey(projectId), 'intake')
      emitWorkflowStepCompletionChange()
      return 'intake'
    }

    return null
  } catch {
    return null
  }
}

export function getMaxAccessibleStepIndex(projectId: string): number {
  const step = getStoredWorkflowStep(projectId)
  if (!step) return 0
  return getStepIndex(step)
}

export function hasCompletedStep(
  projectId: string,
  step: WorkflowStepCompletion
): boolean {
  const stored = getStoredWorkflowStep(projectId)
  if (!stored) return false
  return getStepIndex(stored) >= getStepIndex(step)
}

export function hasSubmittedIntake(projectId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(getIntakeSubmissionStorageKey(projectId)) === '1'
  } catch {
    return false
  }
}

export function markIntakeSubmitted(projectId: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getIntakeSubmissionStorageKey(projectId), '1')
    emitWorkflowStepCompletionChange()
  } catch {
    return
  }
}

export function markWorkflowStepCompleted(
  projectId: string,
  step: WorkflowStepCompletion
): void {
  if (typeof window === 'undefined') return

  try {
    const currentStep = getStoredWorkflowStep(projectId)
    if (!currentStep || getStepIndex(step) > getStepIndex(currentStep)) {
      window.localStorage.setItem(getStorageKey(projectId), step)
      emitWorkflowStepCompletionChange()
    }
  } catch {
    return
  }
}

export function clearWorkflowStepCompletions(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith(INTAKE_SUBMISSION_STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key)
    })
    emitWorkflowStepCompletionChange()
  } catch {
    return
  }
}
