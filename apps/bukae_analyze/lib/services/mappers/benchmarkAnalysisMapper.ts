import type { BenchmarkAnalysisResponseDto } from '@/lib/types/api/benchmarkAnalysis'
import type {
  AnalysisProgressState,
  AnalysisPollingState,
  AnalysisSnapshot,
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

function hasMeaningfulText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function firstNonEmptyMessage(
  ...messages: Array<string | null | undefined>
): string | null {
  return messages.find(hasMeaningfulText) ?? null
}

function normalizeBenchmarkFailureMessage(message: string | null): string | null {
  if (!message) return null

  if (
    message.includes('ActivityError') &&
    message.includes('Activity task failed')
  ) {
    return '분석 작업 중 일시적인 오류가 발생했습니다. 새 프로젝트로 다시 시작해주세요.'
  }

  return message
}

function clampPercent(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.min(100, Math.max(0, Math.round(value)))
}

function mapAnalysisProgress(
  dto: BenchmarkAnalysisResponseDto
): AnalysisProgressState | null {
  const progress = dto.analysisProgress
  if (!progress) return null

  return {
    stage: progress.stage ?? null,
    status: progress.status ?? null,
    percent: clampPercent(progress.percent),
    stageIndex: progress.stageIndex ?? null,
    stageLabel: progress.stageLabel ?? null,
    stageTotal: progress.stageTotal ?? null,
    updatedAt: progress.updatedAt ?? null,
  }
}

function hasAnalysisContent(dto: BenchmarkAnalysisResponseDto): boolean {
  const tabs = dto.normalized_analysis_tabs

  return Boolean(
    hasMeaningfulText(tabs?.hook?.coreAnalysis) ||
    (tabs?.hook?.evidence?.length ?? 0) > 0 ||
    hasMeaningfulText(tabs?.thumbnail?.coreAnalysis) ||
    hasMeaningfulText(tabs?.thumbnail?.mainText) ||
    (tabs?.thumbnail?.evidence?.length ?? 0) > 0 ||
    (tabs?.thumbnail?.colors?.length ?? 0) > 0 ||
    (tabs?.structure?.scenes?.length ?? 0) > 0 ||
    hasMeaningfulText(tabs?.structure?.targetAudience) ||
    (tabs?.structure?.targetAudienceKeywords?.length ?? 0) > 0 ||
    (tabs?.structure?.editingDirections?.length ?? 0) > 0 ||
    hasMeaningfulText(tabs?.structure?.trendContext) ||
    hasMeaningfulText(tabs?.structure?.ctaStrategy) ||
    hasMeaningfulText(tabs?.structure?.directorComment) ||
    hasMeaningfulText(tabs?.structure?.director_comment) ||
    hasMeaningfulText(dto.hookSummary) ||
    hasMeaningfulText(dto.editPace) ||
    hasMeaningfulText(dto.subtitleStyleSummary) ||
    hasMeaningfulText(dto.narrationStyleSummary) ||
    hasMeaningfulText(dto.persuasionStructureSummary) ||
    hasMeaningfulText(dto.targetAudienceGuess) ||
    hasMeaningfulText(dto.benchmarkProfile?.profile_summary) ||
    hasMeaningfulText(dto.benchmarkProfile?.target_audience_guess)
  )
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
  const durationSec = sourceMetadata?.duration_sec

  return {
    hookRange,
    durationSec: parseHookRangeSec(hookRange),
    videoLengthMin:
      typeof durationSec === 'number'
        ? durationSec / 60
        : undefined,
    avgCutLengthSec: parseAvgCutLengthFromEvidence(hook?.evidence ?? []),
    openingType: hook?.coreCard?.openingType ?? '',
    emotionTrigger: hook?.coreCard?.emotionTrigger ?? '',
    pacing: normalizePacing(hook?.coreCard?.pacing ?? 'slow'),
    why: hook?.coreAnalysis ?? dto.hookSummary ?? '',
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

function mapCtaStrategy(dto: BenchmarkAnalysisResponseDto): VideoStructureAnalysis['ctaStrategy'] {
  const ctaStrategy = dto.normalized_analysis_tabs?.structure?.ctaStrategy

  if (!ctaStrategy) return undefined

  return [
    {
      label: '전략',
      description: ctaStrategy,
    },
  ]
}

function mapVideoStructureAnalysis(dto: BenchmarkAnalysisResponseDto): VideoStructureAnalysis {
  const structure = dto.normalized_analysis_tabs?.structure

  return {
    overview:
      dto.benchmarkProfile?.profile_summary ??
      dto.persuasionStructureSummary ??
      '',
    targetAudienceDescription:
      structure?.targetAudience ??
      dto.targetAudienceGuess ??
      dto.benchmarkProfile?.target_audience_guess ??
      '',
    targetAudienceAttributes: structure?.targetAudienceKeywords ?? [],
    storyStructure: mapStoryStructure(dto),
    viralPointCards: mapViralPointCards(dto),
    directorComment: structure?.directorComment ?? structure?.director_comment,
    editingPoints: mapEditingPoints(dto),
    trendContextDescription: structure?.trendContext,
    ctaStrategy: mapCtaStrategy(dto),
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

export function mapBenchmarkAnalysisPollingState(
  dto: BenchmarkAnalysisResponseDto
): AnalysisPollingState {
  return {
    submissionStatus: dto.submissionStatus,
    analysisStatus: dto.analysisStatus ?? null,
    projectStatus: dto.projectStatus ?? null,
    currentStep: dto.currentStep ?? null,
    readyForCategorySelection: dto.readyForCategorySelection ?? false,
    errorMessage: normalizeBenchmarkFailureMessage(firstNonEmptyMessage(
      dto.failure?.userMessage,
      dto.failure?.summary,
      dto.failure?.message,
      dto.lastErrorMessage
    )),
    hasResult: hasAnalysisContent(dto),
    progress: mapAnalysisProgress(dto),
  }
}

export function mapBenchmarkAnalysisSnapshot(
  dto: BenchmarkAnalysisResponseDto
): AnalysisSnapshot {
  const hasContent = hasAnalysisContent(dto)

  return {
    polling: mapBenchmarkAnalysisPollingState(dto),
    result: hasContent
      ? mapBenchmarkAnalysisResult(dto)
      : null,
  }
}
