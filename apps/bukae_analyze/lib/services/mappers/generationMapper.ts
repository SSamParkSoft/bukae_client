import type { GenerationArtifactDto, GenerationRequestDto, GenerationResponseDto } from '@/lib/types/api/generation'
import type { Generation, GenerationArtifact, GenerationFailure, GenerationStartCommand } from '@/lib/types/domain'
import type { ShootingGuide, ShootingScene } from '@/lib/types/domain/shootingGuide'

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

// --- guidePreview raw record → ShootingGuide ---

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function joinList(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => typeof item === 'string' ? item : '')
    .filter(Boolean)
    .join('\n')
}

function mapGuidePreviewToShootingGuide(
  guidePreview: Record<string, unknown> | null,
  scriptPreview: string
): ShootingGuide | null {
  const filmingGuide = asRecord(guidePreview?.filming_guide)
  const sceneRecords = Array.isArray(filmingGuide?.scenes)
    ? filmingGuide.scenes.map(asRecord).filter((scene): scene is Record<string, unknown> => scene !== null)
    : []

  if (sceneRecords.length === 0) return null

  let cursorSec = 0
  const scenes = sceneRecords.map((scene, index): ShootingScene => {
    const durationSec = asNumber(scene.duration_sec) || asNumber(scene.durationSec) || 3
    const sceneNumber = asNumber(scene.scene_no) || asNumber(scene.sceneNumber) || index + 1
    const narration = asString(scene.narration)
    const caption = asString(scene.caption)
    const checklist = joinList(scene.checklist)
    const props = joinList(scene.props)
    const startTimeSec = cursorSec
    const endTimeSec = cursorSec + durationSec
    cursorSec = endTimeSec

    return {
      sceneNumber,
      sceneName: asString(scene.title) || `Scene ${sceneNumber}`,
      startTimeSec,
      endTimeSec,
      description: asString(scene.visual) || asString(scene.description),
      visualGuide: [
        asString(scene.visual),
        props ? `소품: ${props}` : '',
        checklist ? `체크리스트:\n${checklist}` : '',
      ].filter(Boolean).join('\n\n'),
      audioScript: narration || scriptPreview,
      subtitleScript: caption,
      planningBasis: checklist || asString(guidePreview?.title) || '최종 기획안 기반으로 생성된 촬영가이드입니다.',
    }
  })

  return { scenes }
}

// --- DTO → Domain Model ---

export function mapGeneration(dto: GenerationResponseDto): Generation {
  const scriptPreview = dto.scriptPreview ?? ''
  const guidePreview = dto.guidePreview ?? null

  return {
    projectId: dto.projectId ?? null,
    generationRequestId: dto.generationRequestId,
    briefVersionId: dto.briefVersionId ?? null,
    generationStatus: dto.generationStatus,
    generationMode: dto.generationMode ?? null,
    variantCount: dto.variantCount ?? null,
    guideUrl: dto.guideUrl ?? null,
    scriptUrl: dto.scriptUrl ?? null,
    shootingGuide: mapGuidePreviewToShootingGuide(guidePreview, scriptPreview),
    scriptPreview,
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

// --- Command → DTO 변환 ---

export function mapGenerationStartToDto(command: GenerationStartCommand): GenerationRequestDto {
  return {
    briefVersionId: command.briefVersionId,
    generationMode: command.generationMode,
    variantCount: command.variantCount,
  }
}
