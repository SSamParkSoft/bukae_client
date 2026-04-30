import type { ProjectPollingState, AnalysisSnapshot, VideoAnalysisResult } from '@/lib/types/domain'
import {
  isProjectCategorySelectionWorkflow,
  isProjectFailedWorkflow,
} from '@/lib/types/domain'

export type AnalysisResourceStatus = 'idle' | 'loading' | 'ready' | 'error'
export type AnalysisResourceErrorType = 'failed' | 'missing_result' | 'unknown'

export interface AnalysisResourceState {
  status: AnalysisResourceStatus
  submissionStatus: string | null
  analysisStatus: string | null
  errorType: AnalysisResourceErrorType | null
  errorMessage: string | null
  result: VideoAnalysisResult | null
}

export interface AnalysisResourceSnapshotState {
  projectStatus: string | null
  submissionStatus: string | null
  analysisStatus: string | null
  result: VideoAnalysisResult | null
  errorMessage: string | null
  isCompleted: boolean
  isProjectFailed: boolean
}

export const EMPTY_ANALYSIS_RESOURCE_SNAPSHOT: AnalysisResourceSnapshotState = {
  projectStatus: null,
  submissionStatus: null,
  analysisStatus: null,
  result: null,
  errorMessage: null,
  isCompleted: false,
  isProjectFailed: false,
}

export function isAnalysisCompleted(
  project: ProjectPollingState,
  snapshot: AnalysisSnapshot
): boolean {
  return (
    snapshot.polling.analysisStatus === 'COMPLETED' ||
    snapshot.polling.readyForCategorySelection ||
    isProjectCategorySelectionWorkflow(project.workflow)
  )
}

export function getAnalysisFailureMessage(
  project: ProjectPollingState,
  snapshot: AnalysisSnapshot
): string | null {
  if (
    isProjectFailedWorkflow(project.workflow) ||
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
    analysisStatus: snapshot.polling.analysisStatus,
    result: snapshot.result ?? previousResult,
    errorMessage: errorMessage ?? getAnalysisFailureMessage(project, snapshot),
    isCompleted: isAnalysisCompleted(project, snapshot),
    isProjectFailed: isProjectFailedWorkflow(project.workflow),
  }
}

export function deriveAnalysisResourceState(
  snapshot: AnalysisResourceSnapshotState
): AnalysisResourceState {
  const hasResult = snapshot.result !== null
  const isFailedStatus =
    snapshot.submissionStatus === 'FAILED' ||
    snapshot.isProjectFailed

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
      submissionStatus: snapshot.submissionStatus,
      analysisStatus: snapshot.analysisStatus,
      errorType: null,
      errorMessage: null,
      result: snapshot.result,
    }
  }

  if (snapshot.errorMessage) {
    return {
      status: 'error',
      submissionStatus: snapshot.submissionStatus,
      analysisStatus: snapshot.analysisStatus,
      errorType,
      errorMessage: snapshot.errorMessage,
      result: snapshot.result,
    }
  }

  return {
    status: 'loading',
    submissionStatus: snapshot.submissionStatus,
    analysisStatus: snapshot.analysisStatus,
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
    snapshot.isProjectFailed
  )
}

export function isAnalysisReadySnapshot(
  snapshot: AnalysisResourceSnapshotState
): boolean {
  return snapshot.isCompleted && snapshot.result !== null && !snapshot.errorMessage
}
