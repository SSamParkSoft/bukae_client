import type {
  BenchmarkSubmissionState,
  ProjectPollingState,
  ProjectSession,
} from '@/lib/types/domain'
import type {
  BenchmarkSubmissionDto,
  ProjectDetailDto,
} from '@/lib/types/api/project'
import { createProjectWorkflow } from '@/lib/types/domain'

function firstNonEmptyMessage(
  ...messages: Array<string | null | undefined>
): string | null {
  return messages.find((message) => message?.trim()) ?? null
}

export function mapProjectSession(dto: ProjectDetailDto): ProjectSession {
  const currentStep = dto.currentStep ?? null

  return {
    projectId: dto.projectId,
    projectStatus: dto.status,
    currentStep,
    workflow: createProjectWorkflow({
      status: dto.status,
      currentStep,
    }),
  }
}

export function mapBenchmarkSubmissionState(
  dto: BenchmarkSubmissionDto
): BenchmarkSubmissionState {
  const currentStep = dto.currentStep ?? null

  return {
    projectId: dto.projectId,
    projectStatus: dto.projectStatus,
    currentStep,
    workflow: createProjectWorkflow({
      status: dto.projectStatus,
      currentStep,
    }),
    submissionStatus: dto.submissionStatus,
  }
}

export function mapProjectPollingState(dto: ProjectDetailDto): ProjectPollingState {
  const currentStep = dto.currentStep ?? null

  return {
    projectStatus: dto.status,
    currentStep,
    workflow: createProjectWorkflow({
      status: dto.status,
      currentStep,
    }),
    activeBriefVersionId: dto.activeBriefVersionId ?? null,
    lastSummary: dto.lastSummary ?? null,
    errorMessage: firstNonEmptyMessage(
      dto.failure?.summary,
      dto.failure?.message,
      dto.lastErrorMessage
    ),
  }
}
