import type { BenchmarkAnalysisResponseDto } from '@/lib/types/api/benchmarkAnalysis'
import type {
  HookAnalysis,
  StorySegment,
  ThumbnailAnalysis,
  VideoAnalysis,
  VideoAnalysisResult,
  VideoStructureAnalysis,
  ViralPointCard,
} from '@/lib/types/domain'

const SCENE_ROLE_LABEL: Record<string, string> = {
  hook: '훅',
  problem_setup: '문제 제기',
  proof_or_demo: '증명/데모',
  cta: 'CTA',
  resolution: '해결',
  outro: '아웃트로',
}

function parseHookRangeSec(hookRange: string): number {
  const match = hookRange.match(/~(\d+(\.\d+)?)초/)
  return match ? parseFloat(match[1]) : 0
}

function parseAvgCutLengthFromEvidence(evidence: string[]): number | undefined {
  for (const item of evidence) {
    const match = item.match(/평균 컷 길이[:\s]+(\d+(\.\d+)?)초/)
    if (match) return parseFloat(match[1])
  }
  return undefined
}

function translateSceneRole(role: string): string {
  return SCENE_ROLE_LABEL[role] ?? role
}

function normalizePacing(raw: string): HookAnalysis['pacing'] {
  const lower = raw.toLowerCase()
  if (lower === 'fast') return 'fast'
  if (lower === 'medium') return 'medium'
  return 'slow'
}

function mapThumbnailAnalysis(dto: BenchmarkAnalysisResponseDto): ThumbnailAnalysis {
  const thumbnail = dto.normalized_analysis_tabs?.thumbnail
  const sourceMetadata = dto.normalized_analysis_tabs?.source?.metadata

  return {
    imageUrl: thumbnail?.imageUrl ?? sourceMetadata?.thumbnail_url ?? '',
    mainText: thumbnail?.mainText ?? '',
    colors: thumbnail?.colors ?? [],
    ctrGrade: thumbnail?.ctrGrade ?? '',
    why: thumbnail?.coreAnalysis,
    evidence: thumbnail?.evidence ?? [],
    textRatio: thumbnail?.textRatio,
    layoutComposition: thumbnail?.layoutComposition,
    facePresence: thumbnail?.facePresence,
    numberEmphasis:
      thumbnail?.numberEmphasis === undefined
        ? undefined
        : thumbnail.numberEmphasis
          ? '있음'
          : '없음',
    emotionTrigger: thumbnail?.emotionTrigger,
  }
}

function mapHookAnalysis(dto: BenchmarkAnalysisResponseDto): HookAnalysis {
  const hook = dto.normalized_analysis_tabs?.hook
  const sourceMetadata = dto.normalized_analysis_tabs?.source?.metadata
  const hookRange = hook?.coreCard?.hookRange ?? '0~0초'

  return {
    hookRange,
    durationSec: parseHookRangeSec(hookRange),
    videoLengthMin:
      sourceMetadata?.duration_sec !== undefined
        ? sourceMetadata.duration_sec / 60
        : undefined,
    avgCutLengthSec: parseAvgCutLengthFromEvidence(hook?.evidence ?? []),
    openingType: hook?.coreCard?.openingType ?? '',
    emotionTrigger: hook?.coreCard?.emotionTrigger ?? '',
    pacing: normalizePacing(hook?.coreCard?.pacing ?? 'slow'),
    why: hook?.coreAnalysis ?? '',
    evidence: hook?.evidence ?? [],
    viewerPositioning: hook?.insightBox?.viewerPositioning,
    visualHook: hook?.insightBox?.visualHook,
    firstSentence: hook?.insightBox?.firstSentence,
  }
}

function mapStoryStructure(dto: BenchmarkAnalysisResponseDto): StorySegment[] {
  const scenes = dto.normalized_analysis_tabs?.structure?.scenes ?? []

  return scenes.map((scene) => ({
    timeframe: scene.time_range,
    title: translateSceneRole(scene.scene_role),
    description: scene.scene_point ?? scene.visual_summary ?? '',
  }))
}

function mapViralPointCards(dto: BenchmarkAnalysisResponseDto): ViralPointCard[] {
  const scenes = dto.normalized_analysis_tabs?.structure?.scenes ?? []

  return scenes
    .filter((scene) => scene.why_it_works)
    .map((scene) => ({
      title: translateSceneRole(scene.scene_role),
      summary: scene.why_it_works!,
    }))
}

function mapEditingPoints(dto: BenchmarkAnalysisResponseDto): VideoStructureAnalysis['editingPoints'] {
  const directions = dto.normalized_analysis_tabs?.structure?.editingDirections ?? []

  if (directions.length === 0) return undefined

  return directions.map((direction) => ({
    label: direction.title,
    description: direction.summary,
  }))
}

function mapVideoStructureAnalysis(dto: BenchmarkAnalysisResponseDto): VideoStructureAnalysis {
  const structure = dto.normalized_analysis_tabs?.structure

  return {
    overview: dto.benchmarkProfile?.profile_summary ?? '',
    targetAudienceDescription:
      structure?.targetAudience ??
      dto.benchmarkProfile?.target_audience_guess ??
      '',
    targetAudienceAttributes: structure?.targetAudienceKeywords ?? [],
    storyStructure: mapStoryStructure(dto),
    viralPointCards: mapViralPointCards(dto),
    editingPoints: mapEditingPoints(dto),
  }
}

export function mapBenchmarkAnalysisToVideoAnalysis(
  dto: BenchmarkAnalysisResponseDto
): VideoAnalysis {
  return {
    thumbnail: mapThumbnailAnalysis(dto),
    hook: mapHookAnalysis(dto),
    structure: mapVideoStructureAnalysis(dto),
  }
}

export function mapBenchmarkAnalysisResult(
  dto: BenchmarkAnalysisResponseDto
): VideoAnalysisResult {
  return {
    videoAnalysis: mapBenchmarkAnalysisToVideoAnalysis(dto),
    videoSrc: dto.normalized_analysis_tabs?.source?.video?.public_url ?? '',
    referenceUrl: dto.normalized_analysis_tabs?.source?.metadata?.source_url ?? '',
  }
}
