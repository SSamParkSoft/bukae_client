import { getPlanningSession } from '@/lib/services/planning'
import { getProjectPollingState } from '@/lib/services/projects'
import {
  formatWorkflowState,
  getProjectWorkflowState,
  isPlanningStep,
} from '@/lib/services/projectWorkflowState'
import {
  isProjectFinalizedForGeneration,
  isProjectPlanningWorkflow,
} from '@/lib/types/domain'

const POLLING_INTERVAL_MS = 5000
const MAX_FINALIZE_POLLING_ATTEMPTS = 120

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export interface FinalizedProject {
  briefVersionId: string
  title: string
  planningSummary: string
  status: string
}

export function mapFinalizedProjectState(
  project: Awaited<ReturnType<typeof getProjectPollingState>>
): FinalizedProject | null {
  if (
    !isProjectFinalizedForGeneration(project.workflow) ||
    !project.activeBriefVersionId
  ) {
    return null
  }

  return {
    briefVersionId: project.activeBriefVersionId,
    title: '최종 기획안 준비 완료',
    planningSummary: project.lastSummary ?? '',
    status: project.projectStatus,
  }
}

export async function getFinalizedProject(projectId: string): Promise<FinalizedProject | null> {
  return mapFinalizedProjectState(await getProjectPollingState(projectId))
}

export async function waitFinalizedProject(
  projectId: string
): Promise<FinalizedProject> {
  for (let attempt = 0; attempt < MAX_FINALIZE_POLLING_ATTEMPTS; attempt += 1) {
    const project = await getProjectPollingState(projectId)

    if (project.errorMessage) {
      throw new Error(project.errorMessage)
    }

    const finalizedProject = mapFinalizedProjectState(project)

    console.warn('[waitFinalizedProject] tick', {
      attempt,
      projectId,
      projectStatus: project.projectStatus,
      currentStep: project.currentStep,
      activeBriefVersionId: project.activeBriefVersionId,
      workflowStep: project.workflow.step,
      workflowStatus: project.workflow.status,
      isFinalizedForGeneration: isProjectFinalizedForGeneration(project.workflow),
      hasBriefVersionId: Boolean(project.activeBriefVersionId),
      resolved: Boolean(finalizedProject),
    })

    if (finalizedProject) return finalizedProject

    if (isProjectPlanningWorkflow(project.workflow)) {
      const planning = await getPlanningSession(projectId).catch(() => null)

      console.warn('[waitFinalizedProject] planning session', {
        attempt,
        planningMode: planning?.planningMode ?? null,
        planningStatus: planning?.planningStatus ?? null,
        readyForApproval: planning?.readyForApproval ?? null,
        hasFailure: Boolean(planning?.failure),
        failureSummary: planning?.failure?.summary ?? null,
      })

      if (planning?.failure) {
        throw new Error(
          planning.failure.summary ??
          planning.failure.message ??
          '최종 기획안 생성에 실패했습니다.'
        )
      }
    }

    await sleep(POLLING_INTERVAL_MS)
  }

  throw new Error('최종 기획안 생성 시간이 초과되었습니다.')
}

export async function getStepMismatchMessage(projectId: string): Promise<string | null> {
  const workflowState = await getProjectWorkflowState(projectId).catch(() => null)
  if (
    !workflowState ||
    isPlanningStep(workflowState) ||
    isProjectFinalizedForGeneration(workflowState)
  ) {
    return null
  }

  return `현재 프로젝트 단계가 기획 단계가 아닙니다. (${formatWorkflowState(workflowState)})`
}
