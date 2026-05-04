import { apiFetch } from './apiClient'
import type { ApiFetcher } from './apiFetchCore'
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

const NO_BENCHMARK_MESSAGE = '아직 제출된 벤치마크가 없습니다.'

function createEmptyAnalysisSnapshot(): AnalysisSnapshot {
  return {
    polling: {
      submissionStatus: 'NOT_SUBMITTED',
      analysisStatus: null,
      projectStatus: null,
      currentStep: null,
      readyForCategorySelection: false,
      errorMessage: null,
      hasResult: false,
    },
    result: null,
  }
}

function tryParseJson(text: string): unknown {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isNoBenchmarkSubmittedError(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false

  const message = 'message' in body ? body.message : null
  return typeof message === 'string' && message === NO_BENCHMARK_MESSAGE
}

function getObjectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []

  return Object.keys(value)
}

function getNestedObjectKeys(value: unknown, key: string): string[] {
  if (!value || typeof value !== 'object' || !(key in value)) return []

  const nested = value[key as keyof typeof value]
  return getObjectKeys(nested)
}

function getRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  return value as Record<string, unknown>
}

function summarizeZodIssues(issues: unknown): Array<{
  path: string
  code: string | null
  message: string | null
}> {
  if (!Array.isArray(issues)) return []

  return issues.map((issue) => {
    const record = getRecord(issue)
    const path = Array.isArray(record?.path)
      ? record.path.map(String).join('.')
      : ''
    const code = typeof record?.code === 'string' ? record.code : null
    const message = typeof record?.message === 'string' ? record.message : null

    return {
      path,
      code,
      message,
    }
  })
}

function logBenchmarkAnalysisParseFallback(params: {
  json: unknown
  rawIssues: unknown
}) {
  if (process.env.NODE_ENV === 'production') return

  console.warn('[benchmark-analysis] response did not match raw result schema; using polling-only schema', {
    topLevelKeys: getObjectKeys(params.json),
    normalizedTabsKeys: getNestedObjectKeys(params.json, 'normalized_analysis_tabs'),
    analysisRawPayloadKeys: getNestedObjectKeys(params.json, 'analysisRawPayload'),
    rawIssueSummaries: summarizeZodIssues(params.rawIssues),
    rawIssues: params.rawIssues,
  })
}

function logBenchmarkAnalysisSnapshot(params: {
  projectId: string
  parseMode: 'raw-result' | 'polling-only'
  snapshot: AnalysisSnapshot
}) {
  if (process.env.NODE_ENV === 'production') return

  console.warn('[benchmark-analysis] mapped response snapshot', {
    projectId: params.projectId,
    parseMode: params.parseMode,
    polling: params.snapshot.polling,
    hasMappedResult: params.snapshot.result !== null,
    resultKeys: params.snapshot.result ? Object.keys(params.snapshot.result) : [],
  })
}

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
    currentStep: raw.currentStep,
    readyForCategorySelection: raw.readyForCategorySelection,
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
    analysisVersion: raw.analysisVersion,
    videoTypeGuess: raw.videoTypeGuess,
    hookSummary: raw.hookSummary,
    editPace: raw.editPace,
    subtitleStyleSummary: raw.subtitleStyleSummary,
    narrationStyleSummary: raw.narrationStyleSummary,
    persuasionStructureSummary: raw.persuasionStructureSummary,
    targetAudienceGuess: raw.targetAudienceGuess,
    adaptableElements: raw.adaptableElements,
    doNotCopyElements: raw.doNotCopyElements,
    benchmarkProfile: raw.benchmarkProfile,
    benchmarkDna: raw.benchmarkDna,
    riskReport: raw.riskReport,
    analysisRawPayload: raw.analysisRawPayload,
  })
}

export async function getBenchmarkAnalysisWithFetcher(
  fetcher: ApiFetcher,
  projectId: string
): Promise<AnalysisSnapshot> {
  const res = await fetcher(API_ENDPOINTS.projects.benchmarkAnalysis(projectId))
  const text = await res.text()
  const json = tryParseJson(text)

  if (!res.ok) {
    if (res.status === 404 && isNoBenchmarkSubmittedError(json)) {
      return createEmptyAnalysisSnapshot()
    }

    throw new Error(`분석 상태 조회 실패 (HTTP ${res.status})`)
  }

  const rawResult = BenchmarkAnalysisRawResponseSchema.safeParse(json)
  if (rawResult.success) {
    const snapshot = mapBenchmarkAnalysisSnapshot(normalizeBenchmarkAnalysisResponse(rawResult.data))
    logBenchmarkAnalysisSnapshot({
      projectId,
      parseMode: 'raw-result',
      snapshot,
    })
    return snapshot
  }

  const pollingResult = BenchmarkAnalysisPollingSchema.safeParse(json)
  if (pollingResult.success) {
    logBenchmarkAnalysisParseFallback({
      json,
      rawIssues: rawResult.error.issues,
    })

    const snapshot = mapBenchmarkAnalysisSnapshot(normalizeBenchmarkAnalysisResponse(pollingResult.data))
    logBenchmarkAnalysisSnapshot({
      projectId,
      parseMode: 'polling-only',
      snapshot,
    })
    return snapshot
  }

  throw new Error('분석 응답 형식이 예상과 다릅니다.')
}

export async function getBenchmarkAnalysis(
  projectId: string
): Promise<AnalysisSnapshot> {
  return getBenchmarkAnalysisWithFetcher(apiFetch, projectId)
}
