import { z } from 'zod'

// --- 폴링 전용 스키마 (상태 확인용) ---
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

// --- 전체 응답 스키마 (normalized_analysis_tabs 포함) ---

const ThumbnailTabDto = z.object({
  imageUrl: z.string(),
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

const HookCoreCardDto = z.object({
  pacing: z.string(),
  hookRange: z.string(),
  openingType: z.string(),
  emotionTrigger: z.string(),
})

const HookInsightBoxDto = z.object({
  visualHook: z.string().optional(),
  firstSentence: z.string().optional(),
  viewerPositioning: z.string().optional(),
})

const HookTabDto = z.object({
  status: z.string().optional(),
  coreCard: HookCoreCardDto,
  evidence: z.array(z.string()),
  insightBox: HookInsightBoxDto.optional(),
  coreAnalysis: z.string(),
})

// structure 탭: scenes 배열
const SceneCaptureDto = z.object({
  status: z.string().optional(),
  public_url: z.string().optional(),
  scene_number: z.number().optional(),
  capture_time_sec: z.number().optional(),
})

const StructureSceneDto = z.object({
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
  capture: SceneCaptureDto.optional(),
})

const StructureTabDto = z.object({
  scenes: z.array(StructureSceneDto).optional(),
})

const SourceMetadataDto = z.object({
  title: z.string().optional(),
  uploader: z.string().optional(),
  source_url: z.string().optional(),
  view_count: z.number().optional(),
  like_count: z.number().optional(),
  comment_count: z.number().optional(),
  duration_sec: z.number().optional(),
  thumbnail_url: z.string().optional(),
  platform_type: z.string().optional(),
})

const SourceVideoDto = z.object({
  status: z.string().optional(),
  public_url: z.string().optional(),
})

const SourceTabDto = z.object({
  video: SourceVideoDto.optional(),
  metadata: SourceMetadataDto.optional(),
})

const NormalizedAnalysisTabsDto = z.object({
  hook: HookTabDto.optional(),
  source: SourceTabDto.optional(),
  thumbnail: ThumbnailTabDto.optional(),
  thumbnail_analysis: ThumbnailTabDto.optional(),
  structure: StructureTabDto.optional(),
})

const AnalysisRawPayloadDto = z.object({
  source_url: z.string().optional(),
  source_asset: z
    .object({
      status: z.string().optional(),
      public_url: z.string().optional(),
    })
    .optional(),
  normalized_analysis_tabs: NormalizedAnalysisTabsDto.optional(),
  thumbnail_analysis: ThumbnailTabDto.optional(),
})

const BenchmarkProfileDto = z
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
  normalized_analysis_tabs: NormalizedAnalysisTabsDto.optional(),
  thumbnail_analysis: ThumbnailTabDto.optional(),
  analysisRawPayload: AnalysisRawPayloadDto.optional(),
  hookSummary: z.string().nullable().optional(),
  editPace: z.string().nullable().optional(),
  persuasionStructureSummary: z.string().nullable().optional(),
  benchmarkProfile: BenchmarkProfileDto,
})

export type BenchmarkAnalysisResponseDto = z.infer<typeof BenchmarkAnalysisResponseSchema>
