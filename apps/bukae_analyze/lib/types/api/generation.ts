import { z } from 'zod'

const GenerationArtifactSchema = z
  .object({
    generatedArtifactId: z.string().nullable().optional(),
    artifactType: z.string(),
    artifactVersion: z.number().optional(),
    storageKey: z.string().nullable().optional(),
    publicUrl: z.string().nullable().optional(),
    contentChecksum: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .passthrough()

export type GenerationArtifactDto = z.infer<typeof GenerationArtifactSchema>

const GenerationFailureSchema = z
  .object({
    summary: z.string().nullable().optional(),
    message: z.string().nullable().optional(),
    retryable: z.boolean().optional(),
    code: z.string().nullable().optional(),
  })
  .passthrough()

export const GenerationResponseSchema = z
  .object({
    projectId: z.string().optional(),
    generationRequestId: z.string(),
    briefVersionId: z.string().nullable().optional(),
    generationStatus: z.string(),
    generationMode: z.string().nullable().optional(),
    variantCount: z.number().nullable().optional(),
    guideUrl: z.string().nullable().optional(),
    scriptUrl: z.string().nullable().optional(),
    guidePreview: z.record(z.string(), z.unknown()).nullable().optional(),
    scriptPreview: z.string().nullable().optional(),
    qaSurface: z.record(z.string(), z.unknown()).nullable().optional(),
    generationQualityReview: z.record(z.string(), z.unknown()).nullable().optional(),
    variantBundle: z.record(z.string(), z.unknown()).nullable().optional(),
    artifacts: z.array(GenerationArtifactSchema).optional(),
    lastErrorCode: z.string().nullable().optional(),
    lastErrorMessage: z.string().nullable().optional(),
    failure: GenerationFailureSchema.nullable().optional(),
    projectStatus: z.string().nullable().optional(),
    currentStep: z.string().nullable().optional(),
    startedAt: z.string().nullable().optional(),
    completedAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .passthrough()

export type GenerationResponseDto = z.infer<typeof GenerationResponseSchema>

export interface GenerationRequestDto {
  briefVersionId?: string
  generationMode?: 'single'
  variantCount?: number
}
