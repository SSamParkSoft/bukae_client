import type {
  BenchmarkSubmissionState,
  ProjectPollingState,
  ProjectSession,
} from '@/lib/types/domain'
import type {
  BenchmarkSubmissionDto,
  ProjectDetailDto,
} from '@/lib/types/api/project'

function firstNonEmptyMessage(
  ...messages: Array<string | null | undefined>
): string | null {
  return messages.find((message) => message?.trim()) ?? null
}

export function mapProjectSession(dto: ProjectDetailDto): ProjectSession {
  return {
    projectId: dto.projectId,
    projectStatus: dto.status,
    currentStep: dto.currentStep ?? null,
  }
}

export function mapBenchmarkSubmissionState(
  dto: BenchmarkSubmissionDto
): BenchmarkSubmissionState {
  return {
    projectId: dto.projectId,
    projectStatus: dto.projectStatus,
    currentStep: dto.currentStep ?? null,
    submissionStatus: dto.submissionStatus,
  }
}

export function mapProjectPollingState(dto: ProjectDetailDto): ProjectPollingState {
  return {
    projectStatus: dto.status,
    currentStep: dto.currentStep ?? null,
    activeBriefVersionId: dto.activeBriefVersionId ?? null,
    lastSummary: dto.lastSummary ?? null,
    errorMessage: firstNonEmptyMessage(
      dto.failure?.summary,
      dto.failure?.message,
      dto.lastErrorMessage
    ),
  }
}
