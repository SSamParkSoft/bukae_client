import { apiFetch } from './apiClient'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import {
  mapIntakeSubmissionState,
  mapPlanningSession,
} from './mappers'
import {
  IntakeSubmissionResponseSchema,
  PlanningResponseSchema,
  type IntakeSubmissionRequestDto,
  type PlanningMessageRequestDto,
} from '@/lib/types/api/planning'
import type {
  IntakeSubmissionState,
  PlanningSession,
} from '@/lib/types/domain'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function submitIntakeWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  request: IntakeSubmissionRequestDto
): Promise<IntakeSubmissionState> {
  const res = await fetcher(API_ENDPOINTS.projects.intake(projectId), {
    method: 'POST',
    body: JSON.stringify(request),
  })

  await throwIfNotOk(res, '기획 프리세팅 제출 실패')
  return mapIntakeSubmissionState(
    IntakeSubmissionResponseSchema.parse(await res.json())
  )
}

export async function submitIntake(
  projectId: string,
  request: IntakeSubmissionRequestDto
): Promise<IntakeSubmissionState> {
  return submitIntakeWithFetcher(apiFetch, projectId, request)
}

export async function getPlanningSessionWithFetcher(
  fetcher: ApiFetcher,
  projectId: string
): Promise<PlanningSession> {
  const res = await fetcher(API_ENDPOINTS.projects.planning(projectId))
  await throwIfNotOk(res, '기획 세션 조회 실패')
  return mapPlanningSession(PlanningResponseSchema.parse(await res.json()))
}

export async function getPlanningSession(
  projectId: string
): Promise<PlanningSession> {
  return getPlanningSessionWithFetcher(apiFetch, projectId)
}

export async function postPlanningMessageWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  request: PlanningMessageRequestDto
): Promise<PlanningSession> {
  const res = await fetcher(API_ENDPOINTS.projects.planningMessages(projectId), {
    method: 'POST',
    body: JSON.stringify(request),
  })

  await throwIfNotOk(res, '기획 메시지 저장 실패')
  return mapPlanningSession(PlanningResponseSchema.parse(await res.json()))
}

export async function postPlanningMessage(
  projectId: string,
  request: PlanningMessageRequestDto
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(apiFetch, projectId, request)
}
