import { clearWorkflowStepCompletions } from './workflowStepCompletionStorage'
import { clearFeedbackPromptDismissals } from './feedbackPromptStorage'

const ANALYZE_WORKFLOW_STORAGE_PREFIXES = [
  'bukae_analyze:planning-setup:',
  'bukae_analyze:pt1-planning:',
  'bukae_analyze:follow-up-chat-history:',
  'bukae_analyze:generation-request:',
] as const

function clearLocalStorageByPrefixes(prefixes: readonly string[]): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
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

export function clearAnalyzeWorkflowStorage(): void {
  clearLocalStorageByPrefixes(ANALYZE_WORKFLOW_STORAGE_PREFIXES)
  clearFeedbackPromptDismissals()
  clearWorkflowStepCompletions()
}
