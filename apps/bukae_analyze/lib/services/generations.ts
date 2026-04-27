import { apiFetch } from './apiClient'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import { mapGeneration } from './mappers'
import {
  GenerationResponseSchema,
  type GenerationRequestDto,
} from '@/lib/types/api/generation'
import type { Generation } from '@/lib/types/domain'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function startGenerationWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  request: GenerationRequestDto = {}
): Promise<Generation> {
  const res = await fetcher(API_ENDPOINTS.projects.generations(projectId), {
    method: 'POST',
    body: JSON.stringify(request),
  })
  await throwIfNotOk(res, '촬영가이드 생성 시작 실패')
  return mapGeneration(GenerationResponseSchema.parse(await res.json()))
}

export async function startGeneration(
  projectId: string,
  request: GenerationRequestDto = {}
): Promise<Generation> {
  return startGenerationWithFetcher(apiFetch, projectId, request)
}

export async function getGenerationWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  generationRequestId: string
): Promise<Generation> {
  const res = await fetcher(API_ENDPOINTS.projects.generation(projectId, generationRequestId))
  await throwIfNotOk(res, '촬영가이드 생성 상태 조회 실패')
  return mapGeneration(GenerationResponseSchema.parse(await res.json()))
}

export async function getGeneration(
  projectId: string,
  generationRequestId: string
): Promise<Generation> {
  return getGenerationWithFetcher(apiFetch, projectId, generationRequestId)
}
