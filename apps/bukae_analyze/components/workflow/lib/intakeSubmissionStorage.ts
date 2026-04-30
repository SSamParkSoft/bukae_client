const INTAKE_SUBMISSION_STORAGE_PREFIX = 'bukae_analyze:intake-submitted:'

function getIntakeSubmissionStorageKey(projectId: string): string {
  return `${INTAKE_SUBMISSION_STORAGE_PREFIX}${projectId}`
}

export function hasStoredIntakeSubmission(projectId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(getIntakeSubmissionStorageKey(projectId)) === '1'
  } catch {
    return false
  }
}

export function storeIntakeSubmission(projectId: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getIntakeSubmissionStorageKey(projectId), '1')
  } catch {
    return
  }
}

export function clearStoredIntakeSubmissions(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(INTAKE_SUBMISSION_STORAGE_PREFIX)) {
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
