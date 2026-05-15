import { apiFetch } from './apiClient'
import { throwServiceResponseError } from './apiError'
import type { ApiFetcher } from './apiFetchCore'
import { API_ENDPOINTS } from './endpoints'
import { captureAppError, classifyApiError, getErrorStatus, type SentryFlow } from '@/lib/monitoring/sentry'
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

type PlanningMonitoring = {
  flow: SentryFlow
  operation: string
  endpointGroup: string
  method?: string
}

function capturePlanningError(error: unknown, monitoring: PlanningMonitoring) {
  captureAppError(error, {
    flow: monitoring.flow,
    operation: monitoring.operation,
    errorKind: classifyApiError(error),
    tags: {
      endpoint_group: monitoring.endpointGroup,
      method: monitoring.method ?? 'GET',
      status: getErrorStatus(error),
    },
    context: {
      endpoint_group: monitoring.endpointGroup,
      method: monitoring.method ?? 'GET',
      status: getErrorStatus(error) ?? null,
    },
  })
}

// --- Intake ---

export async function submitIntakeWithFetcher(
  fetcher: ApiFetcher,
  projectId: string,
  request: IntakeSubmissionRequestDto
): Promise<IntakeSubmissionState> {
  try {
    const res = await fetcher(API_ENDPOINTS.projects.intake(projectId), {
      method: 'POST',
      body: JSON.stringify(request),
    })

    await throwServiceResponseError(res, '기획 프리세팅 제출 실패')
    return mapIntakeSubmissionState(
      IntakeSubmissionResponseSchema.parse(await res.json())
    )
  } catch (error) {
    capturePlanningError(error, {
      flow: 'intake',
      operation: 'submit_intake',
      endpointGroup: 'project_intake',
      method: 'POST',
    })
    throw error
  }
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
  try {
    const res = await fetcher(API_ENDPOINTS.projects.planning(projectId))
    await throwServiceResponseError(res, '기획 세션 조회 실패')
    return mapPlanningSession(PlanningResponseSchema.parse(await res.json()))
  } catch (error) {
    capturePlanningError(error, {
      flow: 'planning',
      operation: 'get_planning_session',
      endpointGroup: 'project_planning',
    })
    throw error
  }
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
  request: PlanningMessageRequestDto,
  monitoring: PlanningMonitoring = {
    flow: 'planning_message',
    operation: 'post_planning_message',
    endpointGroup: 'planning_messages',
    method: 'POST',
  }
): Promise<PlanningSession> {
  try {
    const res = await fetcher(API_ENDPOINTS.projects.planningMessages(projectId), {
      method: 'POST',
      body: JSON.stringify(request),
    })

    await throwServiceResponseError(res, '기획 메시지 저장 실패')
    return mapPlanningSession(PlanningResponseSchema.parse(await res.json()))
  } catch (error) {
    capturePlanningError(error, monitoring)
    throw error
  }
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
  return postPlanningMessageWithFetcher(fetcher, projectId, mapPt1SlotAnswerToDto(command), {
    flow: 'planning_message',
    operation: 'submit_pt1_slot_answer',
    endpointGroup: 'planning_messages',
    method: 'POST',
  })
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
  return postPlanningMessageWithFetcher(fetcher, projectId, mapPt2FreeTextToDto(command), {
    flow: 'planning_message',
    operation: 'submit_pt2_free_text',
    endpointGroup: 'planning_messages',
    method: 'POST',
  })
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
  return postPlanningMessageWithFetcher(fetcher, projectId, mapWorkspaceEntryToDto(command), {
    flow: 'planning_workspace',
    operation: 'enter_planning_workspace',
    endpointGroup: 'planning_messages',
    method: 'POST',
  })
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
  return postPlanningMessageWithFetcher(fetcher, projectId, mapFinalizePlanningToDto(command), {
    flow: 'planning',
    operation: 'finalize_planning',
    endpointGroup: 'planning_messages',
    method: 'POST',
  })
}

export async function finalizePlanning(
  projectId: string,
  command: FinalizePlanningCommand
): Promise<PlanningSession> {
  return finalizePlanningWithFetcher(apiFetch, projectId, command)
}
