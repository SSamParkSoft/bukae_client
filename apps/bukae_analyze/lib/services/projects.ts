import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
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

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function createProject(title?: string): Promise<ProjectSession> {
  const res = await apiFetch(API_ENDPOINTS.projects.list, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? '' }),
  })
  await throwIfNotOk(res, '프로젝트 생성 실패')
  return mapProjectSession(ProjectDetailSchema.parse(await res.json()))
}

export async function getProjectPollingState(
  projectId: string
): Promise<ProjectPollingState> {
  const res = await apiFetch(API_ENDPOINTS.projects.detail(projectId))
  await throwIfNotOk(res, '프로젝트 상태 조회 실패')
  return mapProjectPollingState(ProjectDetailSchema.parse(await res.json()))
}

export async function submitBenchmark(
  projectId: string,
  sourceUrl: string
): Promise<BenchmarkSubmissionState> {
  const res = await apiFetch(API_ENDPOINTS.projects.benchmark(projectId), {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  })
  await throwIfNotOk(res, '벤치마크 URL 제출 실패')
  return mapBenchmarkSubmissionState(BenchmarkSubmissionSchema.parse(await res.json()))
}
