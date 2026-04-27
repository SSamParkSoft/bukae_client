import { z } from 'zod'

export const BriefResponseSchema = z
  .object({
    projectId: z.string().optional(),
    briefVersionId: z.string(),
    versionNo: z.number().optional(),
    status: z.string(),
    sourceType: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    projectBrief: z.record(z.string(), z.unknown()).nullable().optional(),
    adaptationRules: z.record(z.string(), z.unknown()).nullable().optional(),
    riskReport: z.record(z.string(), z.unknown()).nullable().optional(),
    planningSummary: z.string().nullable().optional(),
    approvedBy: z.string().nullable().optional(),
    approvedAt: z.string().nullable().optional(),
    projectStatus: z.string().nullable().optional(),
    currentStep: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
  })
  .passthrough()

export const BriefListResponseSchema = z.array(BriefResponseSchema)

export type BriefResponseDto = z.infer<typeof BriefResponseSchema>
