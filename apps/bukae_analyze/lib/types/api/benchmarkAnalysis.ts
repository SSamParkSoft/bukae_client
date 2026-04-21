import { z } from 'zod'

export const BenchmarkAnalysisPollingSchema = z.object({
  submissionStatus: z.string(),
  analysisStatus: z.string().nullable().optional(),
  projectStatus: z.string().nullable().optional(),
  lastErrorMessage: z.string().nullable().optional(),
  failure: z
    .object({
      message: z.string().nullable().optional(),
      summary: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type BenchmarkAnalysisPollingDto = z.infer<typeof BenchmarkAnalysisPollingSchema>
