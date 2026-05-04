import type { PlanningSession } from '@/lib/types/domain'
import type { Pt1AnswerDraftCache } from '@/store/useAnalyzeWorkflowStore'

const PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX = 'bukae_analyze:pt1-planning:'
const SNAPSHOT_VERSION = 1
export const PT1_REQUIRED_QUESTION_COUNT = 7

export interface Pt1PlanningSnapshot {
  version: typeof SNAPSHOT_VERSION
  projectId: string
  planningParam: string | null
  savedAt: string
  session: PlanningSession
  draft: Pt1AnswerDraftCache
}

export function isPt1PlanningSession(session: PlanningSession | null): session is PlanningSession {
  const planningMode = session?.planningMode?.toLowerCase() ?? ''
  return planningMode.includes('pt1')
}

export function hasCompletePt1QuestionSet(session: PlanningSession | null): session is PlanningSession {
  return (
    isPt1PlanningSession(session) &&
    session.clarifyingQuestions.length >= PT1_REQUIRED_QUESTION_COUNT
  )
}

function hashString(value: string): string {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(index)
    hash >>>= 0
  }

  return hash.toString(36)
}

function getPt1PlanningSnapshotStorageKey(
  projectId: string,
  planningParam: string | null
): string {
  return `${PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX}${projectId}:${hashString(planningParam ?? '')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isPt1AnswerDraftCache(value: unknown): value is Pt1AnswerDraftCache {
  return (
    isRecord(value) &&
    isRecord(value.selectedAnswers) &&
    isRecord(value.customAnswers) &&
    isRecord(value.fieldAnswers)
  )
}

function parsePt1PlanningSnapshot(value: unknown): Pt1PlanningSnapshot | null {
  if (!isRecord(value)) return null
  if (value.version !== SNAPSHOT_VERSION) return null
  if (typeof value.projectId !== 'string') return null
  if (typeof value.savedAt !== 'string') return null
  if (value.planningParam !== null && typeof value.planningParam !== 'string') return null
  if (!isRecord(value.session)) return null
  if (!isPt1AnswerDraftCache(value.draft)) return null
  if (!hasCompletePt1QuestionSet(value.session as unknown as PlanningSession)) return null

  return value as unknown as Pt1PlanningSnapshot
}

export function getStoredPt1PlanningSnapshot(
  projectId: string,
  planningParam: string | null
): Pt1PlanningSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(
      getPt1PlanningSnapshotStorageKey(projectId, planningParam)
    )
    if (!raw) return null

    return parsePt1PlanningSnapshot(JSON.parse(raw))
  } catch {
    return null
  }
}

export function storePt1PlanningSnapshot(params: {
  projectId: string
  planningParam: string | null
  session: PlanningSession
  draft: Pt1AnswerDraftCache
}): void {
  if (typeof window === 'undefined') return

  const {
    projectId,
    planningParam,
    session,
    draft,
  } = params

  if (!hasCompletePt1QuestionSet(session)) return

  try {
    const snapshot: Pt1PlanningSnapshot = {
      version: SNAPSHOT_VERSION,
      projectId,
      planningParam,
      savedAt: new Date().toISOString(),
      session,
      draft,
    }

    window.localStorage.setItem(
      getPt1PlanningSnapshotStorageKey(projectId, planningParam),
      JSON.stringify(snapshot)
    )
  } catch {
    return
  }
}

export function clearStoredPt1PlanningSnapshots(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith(PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX)) {
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
