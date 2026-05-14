const FEEDBACK_PROMPT_STORAGE_PREFIX = 'bukae_analyze:feedback-prompt:'

function getFeedbackPromptStorageKey(promptId: string, projectId: string): string {
  return `${FEEDBACK_PROMPT_STORAGE_PREFIX}${promptId}:${projectId}`
}

export function hasDismissedFeedbackPrompt(
  promptId: string,
  projectId: string
): boolean {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(
      getFeedbackPromptStorageKey(promptId, projectId)
    ) === '1'
  } catch {
    return false
  }
}

export function dismissFeedbackPrompt(
  promptId: string,
  projectId: string
): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      getFeedbackPromptStorageKey(promptId, projectId),
      '1'
    )
  } catch {
    return
  }
}
