import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
import {
  BenchmarkAnalysisResponseSchema,
  type BenchmarkAnalysisResponseDto,
} from '@/lib/types/api/benchmarkAnalysis'

export async function getBenchmarkAnalysis(
  projectId: string
): Promise<BenchmarkAnalysisResponseDto> {
  const res = await apiFetch(API_ENDPOINTS.projects.benchmarkAnalysis(projectId))
  if (!res.ok) throw new Error(`분석 상태 조회 실패 (HTTP ${res.status})`)
  const json = await res.json()
  const result = BenchmarkAnalysisResponseSchema.safeParse(json)
  if (!result.success) {
    // Zod 파싱 실패 시에도 폴링은 계속 — polling 전용 필드만 추출해서 반환
    return json as BenchmarkAnalysisResponseDto
  }
  return result.data
}
