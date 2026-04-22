import type { BenchmarkAnalysisResponseDto } from '@/lib/types/api/benchmarkAnalysis'
import type {
  VideoAnalysis,
  ThumbnailAnalysis,
  HookAnalysis,
  VideoStructureAnalysis,
  StorySegment,
  ViralPointCard,
} from '@/lib/types/domain'

// "0~3초" → 3
function parseHookRangeSec(hookRange: string): number {
  const match = hookRange.match(/~(\d+(\.\d+)?)초/)
  return match ? parseFloat(match[1]) : 0
}

// evidence 목록에서 "초반 평균 컷 길이: 4.6초" 패턴 파싱
function parseAvgCutLengthFromEvidence(evidence: string[]): number | undefined {
  for (const e of evidence) {
    const match = e.match(/평균 컷 길이[:\s]+(\d+(\.\d+)?)초/)
    if (match) return parseFloat(match[1])
  }
  return undefined
}


const SCENE_ROLE_LABEL: Record<string, string> = {
  hook: '훅',
  problem_setup: '문제 제기',
  proof_or_demo: '증명/데모',
  cta: 'CTA',
  resolution: '해결',
  outro: '아웃트로',
}

function translateSceneRole(role: string): string {
  return SCENE_ROLE_LABEL[role] ?? role
}

function normalizePacing(raw: string): 'fast' | 'medium' | 'slow' {
  const lower = raw.toLowerCase()
  if (lower === 'fast') return 'fast'
  if (lower === 'medium') return 'medium'
  return 'slow'
}

export function mapBenchmarkAnalysisToVideoAnalysis(
  dto: BenchmarkAnalysisResponseDto
): VideoAnalysis {
  const tabs = dto.normalized_analysis_tabs ?? dto.analysisRawPayload?.normalized_analysis_tabs
  const hookTab = tabs?.hook
  const thumbnailTab =
    tabs?.thumbnail ??
    tabs?.thumbnail_analysis ??
    dto.thumbnail_analysis ??
    dto.analysisRawPayload?.thumbnail_analysis
  const structureTab = tabs?.structure
  const sourceTab = tabs?.source

  const thumbnail: ThumbnailAnalysis = {
    imageUrl: thumbnailTab?.imageUrl ?? sourceTab?.metadata?.thumbnail_url ?? '',
    mainText: thumbnailTab?.mainText ?? '',
    colors: thumbnailTab?.colors ?? [],
    ctrGrade: thumbnailTab?.ctrGrade ?? '',
    why: thumbnailTab?.coreAnalysis,
    evidence: thumbnailTab?.evidence ?? [],
    textRatio: thumbnailTab?.textRatio,
    layoutComposition: thumbnailTab?.layoutComposition,
    facePresence: thumbnailTab?.facePresence,
    numberEmphasis: thumbnailTab?.numberEmphasis !== undefined
      ? (thumbnailTab.numberEmphasis ? '있음' : '없음')
      : undefined,
    emotionTrigger: thumbnailTab?.emotionTrigger,
  }

  const hookRange = hookTab?.coreCard?.hookRange ?? '0~0초'
  const hook: HookAnalysis = {
    hookRange,
    durationSec: parseHookRangeSec(hookRange),
    videoLengthMin:
      sourceTab?.metadata?.duration_sec !== undefined
        ? sourceTab.metadata.duration_sec / 60
        : undefined,
    avgCutLengthSec: parseAvgCutLengthFromEvidence(hookTab?.evidence ?? []),
    openingType: hookTab?.coreCard?.openingType ?? '',
    emotionTrigger: hookTab?.coreCard?.emotionTrigger ?? '',
    pacing: normalizePacing(hookTab?.coreCard?.pacing ?? 'slow'),
    why: hookTab?.coreAnalysis ?? '',
    evidence: hookTab?.evidence ?? [],
    viewerPositioning: hookTab?.insightBox?.viewerPositioning,
    visualHook: hookTab?.insightBox?.visualHook,
    firstSentence: hookTab?.insightBox?.firstSentence,
  }

  const scenes = structureTab?.scenes ?? []

  const storyStructure: StorySegment[] = scenes.map((scene) => ({
    timeframe: scene.time_range,
    title: translateSceneRole(scene.scene_role),
    description: scene.scene_point ?? scene.visual_summary ?? '',
  }))

  // scenes의 why_it_works에서 바이럴 포인트 추출 (내용 있는 씬만)
  const viralPointCards: ViralPointCard[] = scenes
    .filter((s) => s.why_it_works)
    .map((s) => ({
      title: translateSceneRole(s.scene_role),
      summary: s.why_it_works!,
    }))

  const overview = dto.benchmarkProfile?.profile_summary ?? ''

  const structure: VideoStructureAnalysis = {
    overview,
    targetAudienceDescription: dto.benchmarkProfile?.target_audience_guess ?? '',
    targetAudienceAttributes: [],
    storyStructure,
    viralPointCards,
  }

  return { thumbnail, hook, structure }
}

export function extractVideoSrc(dto: BenchmarkAnalysisResponseDto): string {
  return (
    dto.normalized_analysis_tabs?.source?.video?.public_url ??
    dto.analysisRawPayload?.normalized_analysis_tabs?.source?.video?.public_url ??
    dto.analysisRawPayload?.source_asset?.public_url ??
    ''
  )
}

export function extractReferenceUrl(dto: BenchmarkAnalysisResponseDto): string {
  return (
    dto.normalized_analysis_tabs?.source?.metadata?.source_url ??
    dto.analysisRawPayload?.normalized_analysis_tabs?.source?.metadata?.source_url ??
    dto.analysisRawPayload?.source_url ??
    ''
  )
}
