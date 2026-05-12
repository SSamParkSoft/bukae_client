import type { PlanningSetupAnswers } from '@/lib/types/domain'
import {
  EMPTY_PLANNING_SETUP_ANSWERS,
  parsePlanningSetupAnswers,
} from '@/lib/utils/planningSetupQuery'

const PLANNING_SETUP_ANSWER_STORAGE_PREFIX = 'bukae_analyze:planning-setup:'
const PLANNING_SETUP_ANSWER_CHANGE_EVENT = 'bukae_analyze:planning-setup-answer-change'
const planningSetupAnswerSnapshotCache = new Map<string, {
  raw: string | null
  answers: PlanningSetupAnswers
}>()

function getPlanningSetupAnswerStorageKey(projectId: string): string {
  return `${PLANNING_SETUP_ANSWER_STORAGE_PREFIX}${projectId}`
}

function emitPlanningSetupAnswerChange(): void {
  if (typeof window === 'undefined') return

  window.dispatchEvent(new Event(PLANNING_SETUP_ANSWER_CHANGE_EVENT))
}

export function subscribePlanningSetupAnswerChanges(
  onStoreChange: () => void
): () => void {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key?.startsWith(PLANNING_SETUP_ANSWER_STORAGE_PREFIX)) {
      onStoreChange()
    }
  }

  window.addEventListener(PLANNING_SETUP_ANSWER_CHANGE_EVENT, onStoreChange)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(PLANNING_SETUP_ANSWER_CHANGE_EVENT, onStoreChange)
    window.removeEventListener('storage', handleStorage)
  }
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

export function getPlanningSetupAnswerSnapshot(projectId: string): PlanningSetupAnswers {
  if (typeof window === 'undefined') return EMPTY_PLANNING_SETUP_ANSWERS

  try {
    const raw = window.localStorage.getItem(getPlanningSetupAnswerStorageKey(projectId))
    const cached = planningSetupAnswerSnapshotCache.get(projectId)

    if (cached && cached.raw === raw) {
      return cached.answers
    }

    const answers = raw ? parsePlanningSetupAnswers(raw) : EMPTY_PLANNING_SETUP_ANSWERS
    planningSetupAnswerSnapshotCache.set(projectId, {
      raw,
      answers,
    })

    return answers
  } catch {
    return EMPTY_PLANNING_SETUP_ANSWERS
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
    emitPlanningSetupAnswerChange()
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
    emitPlanningSetupAnswerChange()
  } catch {
    return
  }
}
