const GENERATION_REQUEST_STORAGE_PREFIX = 'bukae_analyze:generation-request:'

function getStorageKey(projectId: string): string {
  return `${GENERATION_REQUEST_STORAGE_PREFIX}${projectId}`
}

export function getStoredGenerationRequestId(projectId: string | null): string | null {
  if (!projectId || typeof window === 'undefined') return null

  try {
    return window.localStorage.getItem(getStorageKey(projectId))
  } catch {
    return null
  }
}

export function storeGenerationRequestId(
  projectId: string | null,
  generationRequestId: string | null
): void {
  if (!projectId || !generationRequestId || typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getStorageKey(projectId), generationRequestId)
  } catch {
    return
  }
}
