import { apiFetch } from './apiClient'
import { throwServiceResponseError } from './apiError'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import { captureAppError, classifyApiError, getErrorStatus } from '@/lib/monitoring/sentry'
import {
  mapBenchmarkSubmissionState,
  mapProjectPollingState,
  mapProjectSession,
} from './mappers'
import {
  ProjectDetailSchema,
  BenchmarkSubmissionSchema,
} from '@/lib/types/api/project'
import type {
  BenchmarkSubmissionState,
  ProjectPollingState,
  ProjectSession,
} from '@/lib/types/domain'

export async function createProjectWithFetcher(
  fetcher: ApiFetcher,
  title?: string
): Promise<ProjectSession> {
  try {
    const res = await fetcher(API_ENDPOINTS.projects.list, {
      method: 'POST',
      body: JSON.stringify({ title: title ?? '' }),
    })
    await throwServiceResponseError(res, '프로젝트 생성 실패')
    return mapProjectSession(ProjectDetailSchema.parse(await res.json()))
  } catch (error) {
    captureAppError(error, {
      flow: 'analysis',
      operation: 'create_project',
      errorKind: classifyApiError(error),
      tags: {
        endpoint_group: 'projects',
        method: 'POST',
        status: getErrorStatus(error),
      },
      context: {
        endpoint_group: 'projects',
        method: 'POST',
        status: getErrorStatus(error) ?? null,
      },
    })
    throw error
  }
}

export async function createProject(title?: string): Promise<ProjectSession> {
  return createProjectWithFetcher(apiFetch, title)
}

export async function getProjectPollingStateWithFetcher(
  fetcher: ApiFetcher,
  projectId: string
): Promise<ProjectPollingState> {
  try {
    const res = await fetcher(API_ENDPOINTS.projects.detail(projectId))
    await throwServiceResponseError(res, '프로젝트 상태 조회 실패')
    return mapProjectPollingState(ProjectDetailSchema.parse(await res.json()))
  } catch (error) {
    captureAppError(error, {
      flow: 'analysis',
      operation: 'get_project_polling_state',
      errorKind: classifyApiError(error),
      tags: {
        endpoint_group: 'projects',
        method: 'GET',
        status: getErrorStatus(error),
      },
      context: {
        endpoint_group: 'projects',
        method: 'GET',
        status: getErrorStatus(error) ?? null,
      },
    })
    throw error
  }
}

export async function getProjectPollingState(
  projectId: string
): Promise<ProjectPollingState> {
  return getProjectPollingStateWithFetcher(apiFetch, projectId)
}

export async function submitBenchmarkWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  sourceUrl: string
): Promise<BenchmarkSubmissionState> {
  try {
    const res = await fetcher(API_ENDPOINTS.projects.benchmark(projectId), {
      method: 'POST',
      body: JSON.stringify({ sourceUrl }),
    })
    await throwServiceResponseError(res, '벤치마크 URL 제출 실패')
    return mapBenchmarkSubmissionState(BenchmarkSubmissionSchema.parse(await res.json()))
  } catch (error) {
    captureAppError(error, {
      flow: 'analysis',
      operation: 'submit_benchmark',
      errorKind: classifyApiError(error),
      tags: {
        endpoint_group: 'benchmark_submission',
        method: 'POST',
        status: getErrorStatus(error),
      },
      context: {
        endpoint_group: 'benchmark_submission',
        method: 'POST',
        status: getErrorStatus(error) ?? null,
      },
    })
    throw error
  }
}

export async function submitBenchmark(
  projectId: string,
  sourceUrl: string
): Promise<BenchmarkSubmissionState> {
  return submitBenchmarkWithFetcher(apiFetch, projectId, sourceUrl)
}
