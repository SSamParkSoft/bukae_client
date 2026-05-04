const STEP_COMPLETION_ORDER = [
  'benchmark-analysis',
  'intake',
  'planning',
  'generation',
] as const

export type WorkflowStepCompletion = (typeof STEP_COMPLETION_ORDER)[number]

const STORAGE_PREFIX = 'bukae_analyze:workflow-step:'
const OLD_INTAKE_STORAGE_PREFIX = 'bukae_analyze:intake-submitted:'

function getStorageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`
}

function getStepIndex(step: WorkflowStepCompletion): number {
  return STEP_COMPLETION_ORDER.indexOf(step)
}

export function getStoredWorkflowStep(projectId: string): WorkflowStepCompletion | null {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(getStorageKey(projectId))
    if (value && (STEP_COMPLETION_ORDER as readonly string[]).includes(value)) {
      return value as WorkflowStepCompletion
    }

    // Migration: 기존 intakeSubmissionStorage 키에서 마이그레이션
    const oldKey = `${OLD_INTAKE_STORAGE_PREFIX}${projectId}`
    if (window.localStorage.getItem(oldKey) === '1') {
      window.localStorage.setItem(getStorageKey(projectId), 'intake')
      window.localStorage.removeItem(oldKey)
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

export function markWorkflowStepCompleted(
  projectId: string,
  step: WorkflowStepCompletion
): void {
  if (typeof window === 'undefined') return

  try {
    const currentStep = getStoredWorkflowStep(projectId)
    if (!currentStep || getStepIndex(step) > getStepIndex(currentStep)) {
      window.localStorage.setItem(getStorageKey(projectId), step)
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
      if (key?.startsWith(STORAGE_PREFIX) || key?.startsWith(OLD_INTAKE_STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key)
    })
  } catch {
    return
  }
}
