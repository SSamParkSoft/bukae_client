import { describe, expect, it } from 'vitest'
import type { BenchmarkAnalysisResponseDto } from '@/lib/types/api/benchmarkAnalysis'
import { mapBenchmarkAnalysisPollingState } from './benchmarkAnalysisMapper'

function createBenchmarkAnalysisResponse(
  overrides: Partial<BenchmarkAnalysisResponseDto> = {}
): BenchmarkAnalysisResponseDto {
  return {
    submissionStatus: 'COMPLETED',
    analysisStatus: 'COMPLETED',
    projectStatus: 'ACTIVE',
    currentStep: null,
    readyForCategorySelection: false,
    lastErrorMessage: null,
    analysisProgress: null,
    failure: null,
    ...overrides,
  }
}

describe('mapBenchmarkAnalysisPollingState', () => {
  it('normalizes ActivityError userMessage for failed benchmark analysis', () => {
    const polling = mapBenchmarkAnalysisPollingState(createBenchmarkAnalysisResponse({
      analysisStatus: 'FAILED',
      failure: {
        userMessage: 'unknown:ActivityError:Activity task failed',
        summary: null,
        message: null,
      },
    }))

    expect(polling.errorMessage).toBe(
      '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.'
    )
  })
})
