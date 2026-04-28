import { apiFetch } from './apiClient'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import {
  mapIntakeSubmissionState,
  mapIntakeSubmissionToDto,
  mapPlanningSession,
  mapPt1SlotAnswerToDto,
  mapPt2FreeTextToDto,
  mapWorkspaceEntryToDto,
  mapFinalizePlanningToDto,
} from './mappers'
import {
  IntakeSubmissionResponseSchema,
  PlanningResponseSchema,
  type IntakeSubmissionRequestDto,
  type PlanningMessageRequestDto,
} from '@/lib/types/api/planning'
import type {
  FinalizePlanningCommand,
  IntakeSubmissionCommand,
  IntakeSubmissionState,
  Pt1SlotAnswerCommand,
  Pt2FreeTextCommand,
  PlanningSession,
  WorkspaceEntryCommand,
} from '@/lib/types/domain'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return
  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

// --- Intake ---

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

/** @deprecated submitIntakeCommand 사용 */
export async function submitIntake(
  projectId: string,
  request: IntakeSubmissionRequestDto
): Promise<IntakeSubmissionState> {
  return submitIntakeWithFetcher(apiFetch, projectId, request)
}

export async function submitIntakeCommandWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: IntakeSubmissionCommand
): Promise<IntakeSubmissionState> {
  return submitIntakeWithFetcher(fetcher, projectId, mapIntakeSubmissionToDto(command))
}

export async function submitIntakeCommand(
  projectId: string,
  command: IntakeSubmissionCommand
): Promise<IntakeSubmissionState> {
  return submitIntakeCommandWithFetcher(apiFetch, projectId, command)
}

// --- Planning Session (조회) ---

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

// --- Planning Messages (raw DTO 직접 전송) ---

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

/** @deprecated command 기반 함수 사용 */
export async function postPlanningMessage(
  projectId: string,
  request: PlanningMessageRequestDto
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(apiFetch, projectId, request)
}

// --- Planning Commands (domain command 기반) ---

export async function submitPt1SlotAnswerWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: Pt1SlotAnswerCommand
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(fetcher, projectId, mapPt1SlotAnswerToDto(command))
}

export async function submitPt1SlotAnswer(
  projectId: string,
  command: Pt1SlotAnswerCommand
): Promise<PlanningSession> {
  return submitPt1SlotAnswerWithFetcher(apiFetch, projectId, command)
}

export async function submitPt2FreeTextWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: Pt2FreeTextCommand
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(fetcher, projectId, mapPt2FreeTextToDto(command))
}

export async function submitPt2FreeText(
  projectId: string,
  command: Pt2FreeTextCommand
): Promise<PlanningSession> {
  return submitPt2FreeTextWithFetcher(apiFetch, projectId, command)
}

export async function enterPlanningWorkspaceWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: WorkspaceEntryCommand
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(fetcher, projectId, mapWorkspaceEntryToDto(command))
}

export async function enterPlanningWorkspace(
  projectId: string,
  command: WorkspaceEntryCommand
): Promise<PlanningSession> {
  return enterPlanningWorkspaceWithFetcher(apiFetch, projectId, command)
}

export async function finalizePlanningWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  command: FinalizePlanningCommand
): Promise<PlanningSession> {
  return postPlanningMessageWithFetcher(fetcher, projectId, mapFinalizePlanningToDto(command))
}

export async function finalizePlanning(
  projectId: string,
  command: FinalizePlanningCommand
): Promise<PlanningSession> {
  return finalizePlanningWithFetcher(apiFetch, projectId, command)
}
