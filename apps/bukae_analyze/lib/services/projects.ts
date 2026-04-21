import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
import {
  ProjectDetailSchema,
  BenchmarkSubmissionSchema,
  type ProjectDetailDto,
  type BenchmarkSubmissionDto,
} from '@/lib/types/api/project'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function createProject(title?: string): Promise<ProjectDetailDto> {
  const res = await apiFetch(API_ENDPOINTS.projects.list, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? '' }),
  })
  await throwIfNotOk(res, '프로젝트 생성 실패')
  return ProjectDetailSchema.parse(await res.json())
}

export async function submitBenchmark(
  projectId: string,
  sourceUrl: string
): Promise<BenchmarkSubmissionDto> {
  const res = await apiFetch(API_ENDPOINTS.projects.benchmark(projectId), {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  })
  await throwIfNotOk(res, '벤치마크 URL 제출 실패')
  return BenchmarkSubmissionSchema.parse(await res.json())
}
