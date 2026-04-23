import type {
  BenchmarkSubmissionState,
  ProjectSession,
} from '@/lib/types/domain'
import type {
  BenchmarkSubmissionDto,
  ProjectDetailDto,
} from '@/lib/types/api/project'

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
