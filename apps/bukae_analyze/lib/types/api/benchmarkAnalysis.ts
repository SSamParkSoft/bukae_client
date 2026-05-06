import { z } from 'zod'

export const BenchmarkAnalysisPollingSchema = z.object({
  submissionStatus: z.string(),
  analysisStatus: z.string().nullable().optional(),
  projectStatus: z.string().nullable().optional(),
  currentStep: z.string().nullable().optional(),
  readyForCategorySelection: z.boolean().optional(),
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

const ThumbnailTabSchema = z.object({
  imageUrl: z.string().optional(),
  mainText: z.string().optional(),
  imageSize: z.object({ width: z.number(), height: z.number() }).optional(),
  textRatio: z.number().optional(),
  ctrGrade: z.string(),
  coreAnalysis: z.string().optional(),
  evidence: z.array(z.string()),
  colors: z.array(z.string()).optional(),
  facePresence: z.string().optional(),
  emotionTrigger: z.string().optional(),
  numberEmphasis: z.boolean().optional(),
  layoutComposition: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  fallbackUsed: z.boolean().optional(),
  visualElements: z.array(z.string()).optional(),
})

const HookCoreCardSchema = z.object({
  pacing: z.string().optional(),
  hookRange: z.string().optional(),
  openingType: z.string().optional(),
  emotionTrigger: z.string().optional(),
})

const HookInsightBoxSchema = z.object({
  visualHook: z.string().optional(),
  firstSentence: z.string().optional(),
  viewerPositioning: z.string().optional(),
})

const HookTabSchema = z.object({
  status: z.string().optional(),
  coreCard: HookCoreCardSchema.optional(),
  evidence: z.array(z.string()).optional(),
  insightBox: HookInsightBoxSchema.optional(),
  coreAnalysis: z.string().optional(),
})

const SceneCaptureSchema = z.object({
  status: z.string().nullable().optional(),
  public_url: z.string().nullable().optional(),
  scene_number: z.number().optional(),
  capture_time_sec: z.number().nullable().optional(),
})

const StructureSceneSchema = z.object({
  scene_number: z.number(),
  scene_role: z.string(),
  time_range: z.string(),
  scene_point: z.string().optional(),
  why_it_works: z.string().optional(),
  transfer_note: z.string().optional(),
  duration_sec: z.number().optional(),
  start_time_sec: z.number().optional(),
  end_time_sec: z.number().optional(),
  visual_summary: z.string().optional(),
  narration_excerpt: z.string().optional(),
  editing_takeaway: z.string().optional(),
  capture: SceneCaptureSchema.optional(),
})

const EditingDirectionSchema = z.object({
  key: z.string().optional(),
  title: z.string(),
  summary: z.string(),
})

const StructureTabSchema = z.object({
  scenes: z.array(StructureSceneSchema).optional(),
  targetAudience: z.string().optional(),
  targetAudienceKeywords: z.array(z.string()).optional(),
  editingDirections: z.array(EditingDirectionSchema).optional(),
  trendContext: z.string().optional(),
  ctaStrategy: z.string().optional(),
  directorComment: z.string().optional(),
  director_comment: z.string().optional(),
})

const SourceMetadataSchema = z.object({
  title: z.string().nullable().optional(),
  uploader: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  view_count: z.number().nullable().optional(),
  like_count: z.number().nullable().optional(),
  comment_count: z.number().nullable().optional(),
  duration_sec: z.number().nullable().optional(),
  thumbnail_url: z.string().nullable().optional(),
  platform_type: z.string().nullable().optional(),
})

const SourceVideoSchema = z.object({
  status: z.string().nullable().optional(),
  public_url: z.string().nullable().optional(),
})

const SourceTabSchema = z.object({
  video: SourceVideoSchema.optional(),
  metadata: SourceMetadataSchema.optional(),
})

export const BenchmarkAnalysisTabsSchema = z.object({
  hook: HookTabSchema.optional(),
  source: SourceTabSchema.optional(),
  thumbnail: ThumbnailTabSchema.optional(),
  structure: StructureTabSchema.optional(),
})

const BenchmarkProfileSchema = z
  .object({
    profile_summary: z.string().optional(),
    content_category: z.string().optional(),
    edit_pace: z.string().optional(),
    hook_summary: z.string().optional(),
    persuasion_structure: z.array(z.string()).optional(),
    target_audience_guess: z.string().nullable().optional(),
  })
  .nullable()
  .optional()

export const BenchmarkAnalysisResponseSchema = BenchmarkAnalysisPollingSchema.extend({
  normalized_analysis_tabs: BenchmarkAnalysisTabsSchema.optional(),
  analysisVersion: z.string().nullable().optional(),
  videoTypeGuess: z.string().nullable().optional(),
  hookSummary: z.string().nullable().optional(),
  editPace: z.string().nullable().optional(),
  subtitleStyleSummary: z.string().nullable().optional(),
  narrationStyleSummary: z.string().nullable().optional(),
  persuasionStructureSummary: z.string().nullable().optional(),
  targetAudienceGuess: z.string().nullable().optional(),
  adaptableElements: z.array(z.string()).nullable().optional(),
  doNotCopyElements: z.array(z.string()).nullable().optional(),
  benchmarkProfile: BenchmarkProfileSchema,
  benchmarkDna: z.unknown().optional(),
  riskReport: z.unknown().optional(),
  analysisRawPayload: z.unknown().optional(),
})

export type BenchmarkAnalysisResponseDto = z.infer<typeof BenchmarkAnalysisResponseSchema>

export const BenchmarkAnalysisRawResponseSchema = BenchmarkAnalysisPollingSchema.extend({
  normalized_analysis_tabs: z
    .object({
      hook: HookTabSchema.optional(),
      source: SourceTabSchema.optional(),
      thumbnail: ThumbnailTabSchema.optional(),
      thumbnail_analysis: ThumbnailTabSchema.optional(),
      structure: StructureTabSchema.optional(),
    })
    .optional(),
  thumbnail_analysis: ThumbnailTabSchema.optional(),
  analysisRawPayload: z
    .object({
      source_url: z.string().optional(),
      source_asset: z
        .object({
          status: z.string().optional(),
          public_url: z.string().optional(),
        })
        .optional(),
      normalized_analysis_tabs: z
        .object({
          hook: HookTabSchema.optional(),
          source: SourceTabSchema.optional(),
          thumbnail: ThumbnailTabSchema.optional(),
          thumbnail_analysis: ThumbnailTabSchema.optional(),
          structure: StructureTabSchema.optional(),
        })
        .optional(),
      thumbnail_analysis: ThumbnailTabSchema.optional(),
    })
    .optional(),
  hookSummary: z.string().nullable().optional(),
  editPace: z.string().nullable().optional(),
  subtitleStyleSummary: z.string().nullable().optional(),
  narrationStyleSummary: z.string().nullable().optional(),
  persuasionStructureSummary: z.string().nullable().optional(),
  analysisVersion: z.string().nullable().optional(),
  videoTypeGuess: z.string().nullable().optional(),
  targetAudienceGuess: z.string().nullable().optional(),
  adaptableElements: z.array(z.string()).nullable().optional(),
  doNotCopyElements: z.array(z.string()).nullable().optional(),
  benchmarkProfile: BenchmarkProfileSchema,
  benchmarkDna: z.unknown().optional(),
  riskReport: z.unknown().optional(),
})

export type BenchmarkAnalysisRawResponseDto = z.infer<typeof BenchmarkAnalysisRawResponseSchema>
