import type { PlanningSession } from '@/lib/types/domain'
import type { Pt1AnswerDraftCache } from '@/store/useAnalyzeWorkflowStore'

const PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX = 'bukae_analyze:pt1-planning:'
const SNAPSHOT_VERSION = 1

export interface Pt1PlanningSnapshot {
  version: typeof SNAPSHOT_VERSION
  projectId: string
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
    session.clarifyingQuestions.length > 0
  )
}

function getPt1PlanningSnapshotStorageKey(projectId: string): string {
  return `${PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX}${projectId}`
}

function getLegacyPt1PlanningSnapshotStoragePrefix(projectId: string): string {
  return `${PT1_PLANNING_SNAPSHOT_STORAGE_PREFIX}${projectId}:`
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
  if (!isRecord(value.session)) return null
  if (!isPt1AnswerDraftCache(value.draft)) return null
  if (!hasCompletePt1QuestionSet(value.session as unknown as PlanningSession)) return null

  return value as unknown as Pt1PlanningSnapshot
}

export function getStoredPt1PlanningSnapshot(
  projectId: string
): Pt1PlanningSnapshot | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(
      getPt1PlanningSnapshotStorageKey(projectId)
    )
    if (raw) return parsePt1PlanningSnapshot(JSON.parse(raw))

    const legacyPrefix = getLegacyPt1PlanningSnapshotStoragePrefix(projectId)

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith(legacyPrefix)) continue

      const legacyRaw = window.localStorage.getItem(key)
      if (!legacyRaw) continue

      const legacySnapshot = parsePt1PlanningSnapshot(JSON.parse(legacyRaw))
      if (!legacySnapshot) continue
      if (legacySnapshot.projectId !== projectId) continue

      window.localStorage.setItem(
        getPt1PlanningSnapshotStorageKey(projectId),
        JSON.stringify(legacySnapshot)
      )
      return legacySnapshot
    }

    return null
  } catch {
    return null
  }
}

export function storePt1PlanningSnapshot(params: {
  projectId: string
  session: PlanningSession
  draft: Pt1AnswerDraftCache
}): void {
  if (typeof window === 'undefined') return

  const {
    projectId,
    session,
    draft,
  } = params

  if (!hasCompletePt1QuestionSet(session)) return

  try {
    const snapshot: Pt1PlanningSnapshot = {
      version: SNAPSHOT_VERSION,
      projectId,
      savedAt: new Date().toISOString(),
      session,
      draft,
    }

    window.localStorage.setItem(
      getPt1PlanningSnapshotStorageKey(projectId),
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
