import type { GenerationArtifactDto, GenerationResponseDto } from '@/lib/types/api/generation'
import type { Generation, GenerationArtifact, GenerationFailure } from '@/lib/types/domain'

function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function mapGenerationFailure(
  failure: GenerationResponseDto['failure']
): GenerationFailure | null {
  if (!failure) return null

  return {
    summary: failure.summary ?? null,
    message: failure.message ?? null,
    retryable: Boolean(failure.retryable),
    code: failure.code ?? null,
  }
}

function mapGenerationArtifact(
  artifact: GenerationArtifactDto
): GenerationArtifact {
  return {
    generatedArtifactId: artifact.generatedArtifactId ?? null,
    artifactType: artifact.artifactType,
    artifactVersion: artifact.artifactVersion ?? null,
    storageKey: artifact.storageKey ?? null,
    publicUrl: artifact.publicUrl ?? null,
    contentChecksum: artifact.contentChecksum ?? null,
    metadata: artifact.metadata ?? null,
    createdAt: parseOptionalDate(artifact.createdAt),
    updatedAt: parseOptionalDate(artifact.updatedAt),
  }
}

export function mapGeneration(dto: GenerationResponseDto): Generation {
  return {
    projectId: dto.projectId ?? null,
    generationRequestId: dto.generationRequestId,
    briefVersionId: dto.briefVersionId ?? null,
    generationStatus: dto.generationStatus,
    generationMode: dto.generationMode ?? null,
    variantCount: dto.variantCount ?? null,
    guideUrl: dto.guideUrl ?? null,
    scriptUrl: dto.scriptUrl ?? null,
    guidePreview: dto.guidePreview ?? null,
    scriptPreview: dto.scriptPreview ?? '',
    qaSurface: dto.qaSurface ?? null,
    generationQualityReview: dto.generationQualityReview ?? null,
    variantBundle: dto.variantBundle ?? null,
    artifacts: (dto.artifacts ?? []).map(mapGenerationArtifact),
    lastErrorCode: dto.lastErrorCode ?? null,
    lastErrorMessage: dto.lastErrorMessage ?? null,
    failure: mapGenerationFailure(dto.failure),
    projectStatus: dto.projectStatus ?? null,
    currentStep: dto.currentStep ?? null,
    startedAt: parseOptionalDate(dto.startedAt),
    completedAt: parseOptionalDate(dto.completedAt),
    updatedAt: parseOptionalDate(dto.updatedAt),
  }
}
