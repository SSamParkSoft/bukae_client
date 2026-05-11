import type {
  AnalysisProgressState,
  ProjectPollingState,
  AnalysisSnapshot,
  VideoAnalysisResult,
} from '@/lib/types/domain'
import type { ResolvedAppError } from '@/lib/errors/appError'
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
  appError: ResolvedAppError | null
  result: VideoAnalysisResult | null
  progress: AnalysisProgressState | null
  isCompleted: boolean
}

export interface AnalysisResourceSnapshotState {
  projectStatus: string | null
  submissionStatus: string | null
  analysisStatus: string | null
  result: VideoAnalysisResult | null
  progress: AnalysisProgressState | null
  errorMessage: string | null
  appError: ResolvedAppError | null
  isCompleted: boolean
  isProjectFailed: boolean
}

export const EMPTY_ANALYSIS_RESOURCE_SNAPSHOT: AnalysisResourceSnapshotState = {
  projectStatus: null,
  submissionStatus: null,
  analysisStatus: null,
  result: null,
  progress: null,
  errorMessage: null,
  appError: null,
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
      '분석 작업이 실패했습니다. 새 프로젝트로 다시 시작해주세요.'
    )
  }

  return null
}

export function createAnalysisResourceSnapshot(params: {
  project: ProjectPollingState
  snapshot: AnalysisSnapshot
  previousResult?: VideoAnalysisResult | null
  errorMessage?: string | null
  appError?: ResolvedAppError | null
}): AnalysisResourceSnapshotState {
  const {
    project,
    snapshot,
    previousResult = null,
    errorMessage,
    appError = null,
  } = params

  return {
    projectStatus: project.projectStatus,
    submissionStatus: snapshot.polling.submissionStatus,
    analysisStatus: snapshot.polling.analysisStatus,
    result: snapshot.result ?? previousResult,
    progress: snapshot.polling.progress,
    errorMessage: errorMessage ?? getAnalysisFailureMessage(project, snapshot),
    appError,
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
    snapshot.analysisStatus === 'FAILED' ||
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
      appError: null,
      result: snapshot.result,
      progress: snapshot.progress,
      isCompleted: snapshot.isCompleted,
    }
  }

  if (snapshot.errorMessage) {
    return {
      status: 'error',
      submissionStatus: snapshot.submissionStatus,
      analysisStatus: snapshot.analysisStatus,
      errorType,
      errorMessage: snapshot.errorMessage,
      appError: snapshot.appError,
      result: snapshot.result,
      progress: snapshot.progress,
      isCompleted: snapshot.isCompleted,
    }
  }

  return {
    status: 'loading',
    submissionStatus: snapshot.submissionStatus,
    analysisStatus: snapshot.analysisStatus,
    errorType: null,
    errorMessage: null,
    appError: null,
    result: snapshot.result,
    progress: snapshot.progress,
    isCompleted: snapshot.isCompleted,
  }
}

export function isAnalysisTerminalFailure(
  snapshot: AnalysisResourceSnapshotState
): boolean {
  return (
    snapshot.submissionStatus === 'FAILED' ||
    snapshot.analysisStatus === 'FAILED' ||
    snapshot.isProjectFailed
  )
}

export function isAnalysisReadySnapshot(
  snapshot: AnalysisResourceSnapshotState
): boolean {
  return snapshot.isCompleted && snapshot.result !== null && !snapshot.errorMessage
}
