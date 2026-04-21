import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
import {
  BenchmarkAnalysisPollingSchema,
  type BenchmarkAnalysisPollingDto,
} from '@/lib/types/api/benchmarkAnalysis'

export async function getBenchmarkAnalysis(
  projectId: string
): Promise<BenchmarkAnalysisPollingDto> {
  const res = await apiFetch(API_ENDPOINTS.projects.benchmarkAnalysis(projectId))
  if (!res.ok) throw new Error('분석 상태 조회 실패')
  return BenchmarkAnalysisPollingSchema.parse(await res.json())
}
