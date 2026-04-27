import { apiFetch } from './apiClient'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import { mapBrief } from './mappers'
import { BriefListResponseSchema, BriefResponseSchema } from '@/lib/types/api/brief'
import type { Brief } from '@/lib/types/domain'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function listBriefsWithFetcher(
  fetcher: ApiFetcher,
  projectId: string
): Promise<Brief[]> {
  const res = await fetcher(API_ENDPOINTS.projects.briefs(projectId))
  await throwIfNotOk(res, '기획안 목록 조회 실패')
  return BriefListResponseSchema.parse(await res.json()).map(mapBrief)
}

export async function listBriefs(projectId: string): Promise<Brief[]> {
  return listBriefsWithFetcher(apiFetch, projectId)
}

export async function getBriefWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  briefVersionId: string
): Promise<Brief> {
  const res = await fetcher(API_ENDPOINTS.projects.briefDetail(projectId, briefVersionId))
  await throwIfNotOk(res, '기획안 상세 조회 실패')
  return mapBrief(BriefResponseSchema.parse(await res.json()))
}

export async function approveBriefWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  briefVersionId: string
): Promise<Brief> {
  const res = await fetcher(API_ENDPOINTS.projects.briefApprove(projectId, briefVersionId), {
    method: 'POST',
  })
  await throwIfNotOk(res, '기획안 승인 실패')
  return mapBrief(BriefResponseSchema.parse(await res.json()))
}

export async function approveBrief(
  projectId: string,
  briefVersionId: string
): Promise<Brief> {
  return approveBriefWithFetcher(apiFetch, projectId, briefVersionId)
}
