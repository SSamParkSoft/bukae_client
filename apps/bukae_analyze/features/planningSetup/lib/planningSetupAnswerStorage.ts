import type { PlanningSetupAnswers } from '@/lib/types/domain'
import { parsePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'

const PLANNING_SETUP_ANSWER_STORAGE_PREFIX = 'bukae_analyze:planning-setup:'

function getPlanningSetupAnswerStorageKey(projectId: string): string {
  return `${PLANNING_SETUP_ANSWER_STORAGE_PREFIX}${projectId}`
}

export function getStoredPlanningSetupAnswers(
  projectId: string
): PlanningSetupAnswers | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getPlanningSetupAnswerStorageKey(projectId))
    if (!raw) return null

    return parsePlanningSetupAnswers(raw)
  } catch {
    return null
  }
}

export function storePlanningSetupAnswers(
  projectId: string,
  answers: PlanningSetupAnswers
): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(
      getPlanningSetupAnswerStorageKey(projectId),
      JSON.stringify(answers)
    )
  } catch {
    return
  }
}

export function clearStoredPlanningSetupAnswers(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(PLANNING_SETUP_ANSWER_STORAGE_PREFIX)) {
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
