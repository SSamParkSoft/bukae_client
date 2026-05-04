import type { PlanningQuestion, PlanningSession } from '@/lib/types/domain'

function isTruthyRecordValue(
  record: Record<string, unknown> | null,
  key: string
): boolean {
  return record?.[key] === true
}

function getNestedRecord(
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const value = record?.[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function isReadyToFinalize(session: PlanningSession): boolean {
  const surface = session.planningSurface
  const artifacts = session.planningArtifacts
  const surfaceDetailGapState = surface?.detailGapState ?? null
  const artifactDetailGapState = getNestedRecord(artifacts, 'detail_gap_state')

  return (
    session.planningMode === 'finalize' ||
    surface?.readyToFinalize === true ||
    isTruthyRecordValue(artifacts, 'ready_to_finalize') ||
    isTruthyRecordValue(surfaceDetailGapState, 'is_sufficient') ||
    isTruthyRecordValue(artifactDetailGapState, 'is_sufficient')
  )
}

export function canFinalizePlanning(session: PlanningSession | null): boolean {
  return session ? isReadyToFinalize(session) : false
}

export function hasFinalizePlanningMessage(session: PlanningSession): boolean {
  return session.messages.some((message) => (
    message.messageType === 'finalize_planning' ||
    getPayloadString(message.payload, 'event_type') === 'finalize_planning' ||
    getPayloadString(message.payload, 'message_type') === 'finalize_planning'
  ))
}

export function hasPlanningWorkspaceEntryMessage(session: PlanningSession): boolean {
  return session.messages.some((message) => (
    message.messageType === 'planning_workspace_entered' ||
    getPayloadString(message.payload, 'event_type') === 'planning_workspace_entered' ||
    getPayloadString(message.payload, 'message_type') === 'planning_workspace_entered'
  ))
}

export function hasFinalizePlanningStarted(session: PlanningSession): boolean {
  return (
    session.planningStatus === 'DRAFTING' ||
    hasFinalizePlanningMessage(session)
  )
}

export function getActivePlanningQuestions(session: PlanningSession | null): PlanningQuestion[] {
  if (!session) return []
  if (isReadyToFinalize(session)) return []
  return session.clarifyingQuestions
}

export function getPayloadString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key]
  return typeof value === 'string' ? value : null
}

export function getFailureMessage(session: PlanningSession | null): string | null {
  if (!session?.failure) return null

  return (
    session.failure.summary ??
    session.failure.message ??
    '기획 질문을 불러오는 중 문제가 발생했습니다.'
  )
}
