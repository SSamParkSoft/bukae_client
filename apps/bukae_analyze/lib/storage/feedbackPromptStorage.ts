export const FEEDBACK_PROMPT_STORAGE_PREFIX = 'bukae_analyze:feedback-prompt:'

function getFeedbackPromptStorageKey(projectId: string): string {
  return `${FEEDBACK_PROMPT_STORAGE_PREFIX}${projectId}`
}

export function hasDismissedFeedbackPrompt(projectId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(
      getFeedbackPromptStorageKey(projectId)
    ) === '1'
  } catch {
    return false
  }
}

export function dismissFeedbackPrompt(projectId: string): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      getFeedbackPromptStorageKey(projectId),
      '1'
    )
  } catch {
    return
  }
}

export function clearFeedbackPromptDismissals(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(FEEDBACK_PROMPT_STORAGE_PREFIX)) {
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
