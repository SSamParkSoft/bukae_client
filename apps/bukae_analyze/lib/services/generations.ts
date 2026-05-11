import { apiFetch } from './apiClient'
import { throwServiceResponseError } from './apiError'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import { mapGeneration, mapGenerationStartToDto } from './mappers'
import {
  GenerationResponseSchema,
  type GenerationRequestDto,
} from '@/lib/types/api/generation'
import type { Generation, GenerationStartCommand } from '@/lib/types/domain'

export async function startGenerationWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  request: GenerationRequestDto = {}
): Promise<Generation> {
  const res = await fetcher(API_ENDPOINTS.projects.generations(projectId), {
    method: 'POST',
    body: JSON.stringify(request),
  })
  await throwServiceResponseError(res, '촬영가이드 생성 시작 실패')
  return mapGeneration(GenerationResponseSchema.parse(await res.json()))
}

/** @deprecated startGenerationFromCommand 사용 */
export async function startGeneration(
  projectId: string,
  request: GenerationRequestDto = {}
): Promise<Generation> {
  return startGenerationWithFetcher(apiFetch, projectId, request)
}

export async function startGenerationFromCommandWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: GenerationStartCommand
): Promise<Generation> {
  return startGenerationWithFetcher(fetcher, projectId, mapGenerationStartToDto(command))
}

export async function startGenerationFromCommand(
  projectId: string,
  command: GenerationStartCommand
): Promise<Generation> {
  return startGenerationFromCommandWithFetcher(apiFetch, projectId, command)
}

export async function getGenerationWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  generationRequestId: string
): Promise<Generation> {
  const res = await fetcher(API_ENDPOINTS.projects.generation(projectId, generationRequestId))
  await throwServiceResponseError(res, '촬영가이드 생성 상태 조회 실패')
  return mapGeneration(GenerationResponseSchema.parse(await res.json()))
}

export async function getGeneration(
  projectId: string,
  generationRequestId: string
): Promise<Generation> {
  return getGenerationWithFetcher(apiFetch, projectId, generationRequestId)
}
