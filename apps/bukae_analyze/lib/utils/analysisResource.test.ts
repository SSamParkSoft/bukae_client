import { describe, expect, it } from 'vitest'
import type { AnalysisSnapshot, ProjectPollingState } from '@/lib/types/domain'
import { createProjectWorkflow } from '@/lib/types/domain'
import {
  createAnalysisResourceSnapshot,
  deriveAnalysisResourceState,
  getAnalysisFailureMessage,
} from './analysisResource'

function createProjectPollingState(
  overrides: Partial<ProjectPollingState> = {}
): ProjectPollingState {
  return {
    projectStatus: 'FAILED',
    currentStep: 'CATEGORY_SELECTION',
    workflow: createProjectWorkflow({
      status: 'FAILED',
      currentStep: 'CATEGORY_SELECTION',
    }),
    activeBriefVersionId: null,
    lastSummary: null,
    errorMessage: null,
    ...overrides,
  }
}

function createAnalysisSnapshot(
  overrides: Partial<AnalysisSnapshot['polling']> = {}
): AnalysisSnapshot {
  return {
    polling: {
      submissionStatus: 'FAILED',
      analysisStatus: 'FAILED',
      projectStatus: 'FAILED',
      currentStep: 'CATEGORY_SELECTION',
      readyForCategorySelection: false,
      errorMessage: null,
      hasResult: false,
      progress: null,
      ...overrides,
    },
    result: null,
  }
}

describe('analysisResource failure messages', () => {
  it('prefers normalized benchmark failure messages over project raw errors', () => {
    const project = createProjectPollingState({
      errorMessage: 'unknown:ActivityError:Activity task failed',
    })
    const snapshot = createAnalysisSnapshot({
      errorMessage: '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.',
    })

    expect(getAnalysisFailureMessage(project, snapshot)).toBe(
      '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.'
    )
  })

  it('passes the normalized failure message through to the UI resource state', () => {
    const snapshot = createAnalysisResourceSnapshot({
      project: createProjectPollingState({
        errorMessage: 'unknown:ActivityError:Activity task failed',
      }),
      snapshot: createAnalysisSnapshot({
        errorMessage: '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.',
      }),
    })

    expect(deriveAnalysisResourceState(snapshot)).toMatchObject({
      status: 'error',
      errorType: 'failed',
      errorMessage: '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.',
    })
  })
})
