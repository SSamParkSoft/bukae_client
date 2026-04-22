import { z } from 'zod'

const ProjectFailureSchema = z.object({
  stage: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  retryable: z.boolean().optional(),
  suggestedAction: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  occurredAt: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
})

export const ProjectDetailSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  status: z.string(),
  currentStep: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  benchmarkUrl: z.string().nullable().optional(),
  activeBriefVersionId: z.string().nullable().optional(),
  activeWorkflowId: z.string().nullable().optional(),
  activeRunId: z.string().nullable().optional(),
  lastErrorCode: z.string().nullable().optional(),
  lastErrorMessage: z.string().nullable().optional(),
  briefStatus: z.string().nullable().optional(),
  generationStatus: z.string().nullable().optional(),
  lastSummary: z.string().nullable().optional(),
  failure: ProjectFailureSchema.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ProjectDetailDto = z.infer<typeof ProjectDetailSchema>

export const BenchmarkSubmissionSchema = z.object({
  projectId: z.string().uuid(),
  benchmarkSubmissionId: z.string().uuid(),
  sourceUrl: z.string(),
  normalizedSourceUrl: z.string().nullable().optional(),
  platformType: z.string().nullable().optional(),
  submissionStatus: z.string(),
  projectStatus: z.string(),
  currentStep: z.string().nullable().optional(),
  submittedAt: z.string(),
})

export type BenchmarkSubmissionDto = z.infer<typeof BenchmarkSubmissionSchema>
