import type { ProjectPollingState, AnalysisSnapshot, VideoAnalysisResult } from '@/lib/types/domain'

export type AnalysisResourceStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AnalysisResourceErrorType = 'failed' | 'missing_result' | 'unknown'

export interface AnalysisResourceState {
  status: AnalysisResourceStatus
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
  result: VideoAnalysisResult | null
}

export interface AnalysisResourceSnapshotState {
  projectStatus: string | null
  submissionStatus: string | null
  result: VideoAnalysisResult | null
  errorMessage: string | null
  isCompleted: boolean
}

export const EMPTY_ANALYSIS_RESOURCE_SNAPSHOT: AnalysisResourceSnapshotState = {
  projectStatus: null,
  submissionStatus: null,
  result: null,
  errorMessage: null,
  isCompleted: false,
}

export function isAnalysisCompleted(
  project: ProjectPollingState,
  snapshot: AnalysisSnapshot
): boolean {
  return (
    snapshot.polling.analysisStatus === 'COMPLETED' ||
    snapshot.polling.readyForCategorySelection ||
    (
      project.projectStatus === 'INTAKE_READY' &&
      project.currentStep === 'CATEGORY_SELECTION'
    )
  )
}

export function getAnalysisFailureMessage(
  project: ProjectPollingState,
  snapshot: AnalysisSnapshot
): string | null {
  if (
    project.projectStatus === 'FAILED' ||
    project.projectStatus === 'CANCELLED' ||
    snapshot.polling.submissionStatus === 'FAILED' ||
    snapshot.polling.analysisStatus === 'FAILED'
  ) {
    return (
      project.errorMessage ??
      snapshot.polling.errorMessage ??
      '분석에 실패했습니다. 다시 시도해주세요.'
    )
  }

  return null
}

export function createAnalysisResourceSnapshot(params: {
  project: ProjectPollingState
  snapshot: AnalysisSnapshot
  previousResult?: VideoAnalysisResult | null
  errorMessage?: string | null
}): AnalysisResourceSnapshotState {
  const { project, snapshot, previousResult = null, errorMessage } = params

  return {
    projectStatus: project.projectStatus,
    submissionStatus: snapshot.polling.submissionStatus,
    result: snapshot.result ?? previousResult,
    errorMessage: errorMessage ?? getAnalysisFailureMessage(project, snapshot),
    isCompleted: isAnalysisCompleted(project, snapshot),
  }
}

export function deriveAnalysisResourceState(
  snapshot: AnalysisResourceSnapshotState
): AnalysisResourceState {
  const hasResult = snapshot.result !== null
  const isFailedStatus =
    snapshot.submissionStatus === 'FAILED' ||
    snapshot.projectStatus === 'FAILED' ||
    snapshot.projectStatus === 'CANCELLED'

  let errorType: AnalysisResourceErrorType | null = null

  if (snapshot.errorMessage) {
    if (isFailedStatus) {
      errorType = 'failed'
    } else {
      errorType = snapshot.isCompleted ? 'missing_result' : 'unknown'
    }
  }

  if (snapshot.isCompleted && hasResult && !snapshot.errorMessage) {
    return {
      status: 'ready',
      errorType: null,
      errorMessage: null,
      result: snapshot.result,
    }
  }

  if (snapshot.errorMessage) {
    return {
      status: 'error',
      errorType,
      errorMessage: snapshot.errorMessage,
      result: snapshot.result,
    }
  }

  return {
    status: 'loading',
    errorType: null,
    errorMessage: null,
    result: snapshot.result,
  }
}

export function isAnalysisTerminalFailure(
  snapshot: AnalysisResourceSnapshotState
): boolean {
  return (
    snapshot.submissionStatus === 'FAILED' ||
    snapshot.projectStatus === 'FAILED' ||
    snapshot.projectStatus === 'CANCELLED'
  )
}

export function isAnalysisReadySnapshot(
  snapshot: AnalysisResourceSnapshotState
): boolean {
  return snapshot.isCompleted && snapshot.result !== null && !snapshot.errorMessage
}
