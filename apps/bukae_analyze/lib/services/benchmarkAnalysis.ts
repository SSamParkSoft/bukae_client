import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
import { mapBenchmarkAnalysisSnapshot } from './mappers'
import {
  BenchmarkAnalysisPollingSchema,
  BenchmarkAnalysisRawResponseSchema,
  BenchmarkAnalysisResponseSchema,
  type BenchmarkAnalysisPollingDto,
  type BenchmarkAnalysisRawResponseDto,
  type BenchmarkAnalysisResponseDto,
} from '@/lib/types/api/benchmarkAnalysis'
import type { AnalysisSnapshot } from '@/lib/types/domain'

function normalizeBenchmarkAnalysisResponse(
  raw: BenchmarkAnalysisRawResponseDto | BenchmarkAnalysisPollingDto
): BenchmarkAnalysisResponseDto {
  if (!('benchmarkProfile' in raw)) {
    return BenchmarkAnalysisResponseSchema.parse(raw)
  }

  const rawTabs = raw.normalized_analysis_tabs ?? raw.analysisRawPayload?.normalized_analysis_tabs
  const rawSource = rawTabs?.source
  const normalizedSource =
    rawSource || raw.analysisRawPayload?.source_asset || raw.analysisRawPayload?.source_url
      ? {
        video: rawSource?.video ?? {
          status: raw.analysisRawPayload?.source_asset?.status,
          public_url: raw.analysisRawPayload?.source_asset?.public_url,
        },
        metadata: rawSource?.metadata ?? {
          source_url: raw.analysisRawPayload?.source_url,
        },
      }
      : undefined

  return BenchmarkAnalysisResponseSchema.parse({
    submissionStatus: raw.submissionStatus,
    analysisStatus: raw.analysisStatus,
    projectStatus: raw.projectStatus,
    lastErrorMessage: raw.lastErrorMessage,
    failure: raw.failure,
    normalized_analysis_tabs: rawTabs
      ? {
        hook: rawTabs.hook,
        source: normalizedSource,
        thumbnail:
          rawTabs.thumbnail ??
          rawTabs.thumbnail_analysis ??
          raw.thumbnail_analysis ??
          raw.analysisRawPayload?.thumbnail_analysis,
        structure: rawTabs.structure,
      }
      : undefined,
    hookSummary: raw.hookSummary,
    editPace: raw.editPace,
    persuasionStructureSummary: raw.persuasionStructureSummary,
    benchmarkProfile: raw.benchmarkProfile,
  })
}

export async function getBenchmarkAnalysis(
  projectId: string
): Promise<AnalysisSnapshot> {
  const res = await apiFetch(API_ENDPOINTS.projects.benchmarkAnalysis(projectId))
  if (!res.ok) throw new Error(`분석 상태 조회 실패 (HTTP ${res.status})`)
  const json = await res.json()

  const rawResult = BenchmarkAnalysisRawResponseSchema.safeParse(json)
  if (rawResult.success) {
    return mapBenchmarkAnalysisSnapshot(normalizeBenchmarkAnalysisResponse(rawResult.data))
  }

  const pollingResult = BenchmarkAnalysisPollingSchema.safeParse(json)
  if (pollingResult.success) {
    return mapBenchmarkAnalysisSnapshot(normalizeBenchmarkAnalysisResponse(pollingResult.data))
  }

  throw new Error('분석 응답 형식이 예상과 다릅니다.')
}
