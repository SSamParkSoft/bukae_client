import { describe, expect, it } from 'vitest'
import type { ProjectDetailDto } from '@/lib/types/api/project'
import { mapProjectPollingState } from './projectAnalysisMapper'

function createProjectDetailDto(
  overrides: Partial<ProjectDetailDto> = {}
): ProjectDetailDto {
  return {
    projectId: '00000000-0000-0000-0000-000000000001',
    status: 'FAILED',
    currentStep: 'CATEGORY_SELECTION',
    category: null,
    title: null,
    benchmarkUrl: null,
    activeBriefVersionId: null,
    activeWorkflowId: null,
    activeRunId: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    briefStatus: null,
    generationStatus: null,
    lastSummary: null,
    failure: null,
    createdAt: '2026-05-11T00:00:00.000Z',
    updatedAt: '2026-05-11T00:00:00.000Z',
    ...overrides,
  }
}

describe('mapProjectPollingState', () => {
  it('normalizes raw ActivityError messages from project failure state', () => {
    const project = mapProjectPollingState(createProjectDetailDto({
      lastErrorMessage: 'unknown:ActivityError:Activity task failed',
    }))

    expect(project.errorMessage).toBe(
      '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.'
    )
  })
})
