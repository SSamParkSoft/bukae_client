import { apiFetch } from './apiClient'
import { API_ENDPOINTS } from './endpoints'
import {
  ProjectDetailSchema,
  BenchmarkSubmissionSchema,
  type ProjectDetailDto,
  type BenchmarkSubmissionDto,
} from '@/lib/types/api/project'

export async function createProject(title?: string): Promise<ProjectDetailDto> {
  const res = await apiFetch(API_ENDPOINTS.projects.list, {
    method: 'POST',
    body: JSON.stringify({ title: title ?? '' }),
  })
  if (!res.ok) throw new Error('프로젝트 생성 실패')
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
  if (!res.ok) throw new Error('벤치마크 URL 제출 실패')
  return BenchmarkSubmissionSchema.parse(await res.json())
}
