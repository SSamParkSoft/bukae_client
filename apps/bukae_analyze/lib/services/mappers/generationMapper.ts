import type { GenerationArtifactDto, GenerationRequestDto, GenerationResponseDto } from '@/lib/types/api/generation'
import type { Generation, GenerationArtifact, GenerationFailure, GenerationStartCommand } from '@/lib/types/domain'
import { createGenerationWorkflow, createProjectWorkflow } from '@/lib/types/domain'
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

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = asString(record[key]).trim()
    if (value) return value
  }

  return ''
}

function readNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = asNumber(record[key])
    if (value) return value
  }

  return 0
}

function joinList(value: unknown): string {
  return readStringArray(value).join('\n')
}

function readStringArray(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (!Array.isArray(value)) return []

  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

function readArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = readStringArray(record[key])
    if (value.length > 0) return value
  }

  return []
}

function readList(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = joinList(record[key])
    if (value) return value
  }

  return ''
}

function parseTimeSec(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return 0

  const trimmed = value.trim()
  const seconds = Number(trimmed.replace(/s(ec)?$/i, ''))
  if (Number.isFinite(seconds)) return seconds

  const parts = trimmed.split(':').map((part) => Number(part))
  if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return 0

  return parts.reduce((total, part) => total * 60 + part, 0)
}

function readTimeSec(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = parseTimeSec(record[key])
    if (value) return value
  }

  return 0
}

function parseTimelineRange(value: string): { startTimeSec: number; endTimeSec: number } | null {
  const [start, end] = value
    .split(/~|–|-/)
    .map((part) => part.trim())

  if (!start || !end) return null

  return {
    startTimeSec: parseTimeSec(start),
    endTimeSec: parseTimeSec(end),
  }
}

function parseJsonPreview(value: string): unknown | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  for (const candidate of [
    withoutFence,
    withoutFence.slice(withoutFence.indexOf('{'), withoutFence.lastIndexOf('}') + 1),
    withoutFence.slice(withoutFence.indexOf('['), withoutFence.lastIndexOf(']') + 1),
  ]) {
    if (!candidate || candidate.length < 2) continue

    try {
      return JSON.parse(candidate)
    } catch {
      // Try the next possible JSON boundary.
    }
  }

  return null
}

function getNestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return asRecord(record[key])
}

function sceneRecordsFromValue(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((scene): scene is Record<string, unknown> => scene !== null)
  }

  const record = asRecord(value)
  if (!record) return []

  const directScenes = [
    record.scenes,
    record.scene_cards,
    record.sceneCards,
    record.shooting_scenes,
    record.shootingScenes,
    record.filming_scenes,
    record.filmingScenes,
  ]

  for (const scenes of directScenes) {
    const sceneRecords = sceneRecordsFromValue(scenes)
    if (sceneRecords.length > 0) return sceneRecords
  }

  const nestedRecords = [
    getNestedRecord(record, 'filming_guide'),
    getNestedRecord(record, 'filmingGuide'),
    getNestedRecord(record, 'shooting_guide'),
    getNestedRecord(record, 'shootingGuide'),
    getNestedRecord(record, 'guide'),
    getNestedRecord(record, 'guidePreview'),
    getNestedRecord(record, 'script'),
    getNestedRecord(record, 'result'),
    getNestedRecord(record, 'output'),
    getNestedRecord(record, 'data'),
  ]

  for (const nestedRecord of nestedRecords) {
    const sceneRecords = sceneRecordsFromValue(nestedRecord)
    if (sceneRecords.length > 0) return sceneRecords
  }

  return []
}

function splitLabeledBlocks(value: string): Record<string, string> {
  const labels = [
    '비주얼 촬영 가이드',
    '비주얼 가이드',
    '오디오 스크립트',
    '자막 스크립트',
    '기획 및 산출 근거',
    '장면 설명',
    'visualGuide',
    'visual',
    'audioScript',
    'narration',
    'subtitleScript',
    'caption',
    'planningBasis',
    'description',
  ]
  const labelPattern = labels
    .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const matches = [...value.matchAll(new RegExp(`(?:^|\\n)\\s*(${labelPattern})\\s*[:：]\\s*`, 'gi'))]
  const blocks: Record<string, string> = {}

  matches.forEach((match, index) => {
    const label = match[1]
    const start = (match.index ?? 0) + match[0].length
    const next = matches[index + 1]
    const end = next?.index ?? value.length
    blocks[label] = value.slice(start, end).trim()
  })

  return blocks
}

function splitMarkdownTableRow(row: string): string[] {
  const trimmed = row.trim()
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return []

  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim())
}

function sceneRecordsFromMarkdownTable(value: string): Record<string, unknown>[] {
  const rows = value
    .split('\n')
    .map(splitMarkdownTableRow)
    .filter((cells) => cells.length >= 5)

  if (rows.length < 3) return []

  const header = rows[0].map((cell) => cell.replace(/\s/g, ''))
  const timelineIndex = header.findIndex((cell) => cell.includes('타임라인'))
  const visualIndex = header.findIndex((cell) => cell.includes('화면') || cell.includes('피사체'))
  const subtitleIndex = header.findIndex((cell) => cell.includes('자막'))
  const narrationIndex = header.findIndex((cell) => cell.includes('나레이션'))
  const directorIndex = header.findIndex((cell) => cell.includes('감독'))

  if (
    timelineIndex < 0 ||
    visualIndex < 0 ||
    subtitleIndex < 0 ||
    narrationIndex < 0 ||
    directorIndex < 0
  ) {
    return []
  }

  return rows
    .slice(2)
    .map((cells, index): Record<string, unknown> | null => {
      const timeline = cells[timelineIndex] ?? ''
      const timeRange = parseTimelineRange(timeline)
      if (!timeRange) return null

      const visual = cells[visualIndex] ?? ''
      const caption = cells[subtitleIndex] ?? ''
      const narration = cells[narrationIndex] ?? ''
      const planningBasis = cells[directorIndex] ?? ''

      return {
        scene_no: index + 1,
        title: `Scene ${index + 1}`,
        start_time_sec: timeRange.startTimeSec,
        end_time_sec: timeRange.endTimeSec,
        description: caption || narration || visual,
        visual,
        narration,
        caption,
        planning_basis: planningBasis,
      }
    })
    .filter((scene): scene is Record<string, unknown> => scene !== null)
}

function sceneRecordsFromText(value: string): Record<string, unknown>[] {
  const tableScenes = sceneRecordsFromMarkdownTable(value)
  if (tableScenes.length > 0) return tableScenes

  const sceneMatches = [...value.matchAll(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:scene|씬)\s*(\d+)?\s*[:.\-)]?\s*([^\n]*)/gi)]
  if (sceneMatches.length === 0) return []

  return sceneMatches.map((match, index) => {
    const start = match.index ?? 0
    const next = sceneMatches[index + 1]
    const end = next?.index ?? value.length
    const title = match[2]?.trim() ?? ''
    const body = value.slice(start + match[0].length, end).trim()
    const blocks = splitLabeledBlocks(body)

    return {
      scene_no: match[1] ? Number(match[1]) : index + 1,
      title,
      description: blocks['장면 설명'] ?? blocks.description ?? '',
      visual: blocks['비주얼 촬영 가이드'] ?? blocks['비주얼 가이드'] ?? blocks.visualGuide ?? blocks.visual ?? body,
      narration: blocks['오디오 스크립트'] ?? blocks.audioScript ?? blocks.narration ?? '',
      caption: blocks['자막 스크립트'] ?? blocks.subtitleScript ?? blocks.caption ?? '',
      planning_basis: blocks['기획 및 산출 근거'] ?? blocks.planningBasis ?? '',
    }
  })
}

function mapSceneRecordToShootingScene(
  scene: Record<string, unknown>,
  index: number,
  fallbackScript: string,
  guideTitle: string,
  cursorSec: number
): { scene: ShootingScene; endTimeSec: number } {
  const timeRange = parseTimelineRange(readString(scene, ['time_range', 'timeRange', 'timeline', 'timeframe']))
  const durationSec =
    readNumber(scene, ['duration_sec', 'durationSec', 'duration_seconds', 'durationSeconds']) ||
    (timeRange ? timeRange.endTimeSec - timeRange.startTimeSec : 0) ||
    3
  const explicitStartTimeSec = readTimeSec(scene, ['start_time_sec', 'startTimeSec', 'start_sec', 'startSec', 'start_time', 'startTime'])
  const startTimeSec = explicitStartTimeSec || timeRange?.startTimeSec || cursorSec
  const explicitEndTimeSec = readTimeSec(scene, ['end_time_sec', 'endTimeSec', 'end_sec', 'endSec', 'end_time', 'endTime'])
  const endTimeSec = explicitEndTimeSec || timeRange?.endTimeSec || startTimeSec + durationSec
  const sceneNumber = readNumber(scene, ['scene_no', 'sceneNo', 'scene_number', 'sceneNumber', 'number', 'no', 'scene_role', 'sceneRole']) || index + 1
  const sceneName = readString(scene, ['title', 'scene_name', 'sceneName', 'name', 'beat_id', 'beatId']) || `Scene ${sceneNumber}`
  const narration = readString(scene, ['narration', 'audio_script', 'audioScript', 'voice_over', 'voiceOver', 'voiceover', 'dialogue', 'must_say'])
  const caption = readString(scene, ['subtitle_text', 'subtitleText', 'caption', 'subtitle_script', 'subtitleScript', 'subtitle', 'on_screen_text', 'onScreenText'])
  const checklist = readList(scene, ['checklist', 'checks'])
  const mustShow = readArray(scene, ['must_show', 'mustShow'])
  const mustSay = readArray(scene, ['must_say', 'mustSay'])
  const forbiddenMoves = readArray(scene, ['forbidden_moves', 'forbiddenMoves'])
  const visual = readString(scene, ['subject', 'visual', 'visual_guide', 'visualGuide', 'visual_direction', 'visualDirection', 'shot', 'shot_direction', 'shotDirection', 'action'])
  const shotType = readString(scene, ['shot_type', 'shotType'])
  const cameraAction = readString(scene, ['camera_action', 'cameraAction'])
  const transition = readString(scene, ['transition'])
  const emotionTarget = readString(scene, ['emotion_target', 'emotionTarget'])
  const description = readString(scene, ['description', 'scene_point', 'scenePoint', 'summary', 'retention_trigger', 'retentionTrigger']) || visual
  const planningBasis = readString(scene, [
    'director_note',
    'directorNote',
    'planning_basis',
    'planningBasis',
    'rationale',
    'reason',
    'why_it_works',
    'whyItWorks',
  ])
  const proofInsertion = readString(scene, ['proof_insertion', 'proofInsertion'])
  const proofRequirement = readString(scene, ['proof_requirement', 'proofRequirement'])

  return {
    scene: {
      sceneNumber,
      sceneName,
      startTimeSec,
      endTimeSec,
      description,
      visualGuide: visual,
      audioScript: narration || mustSay.join('\n') || fallbackScript,
      subtitleScript: caption,
      planningBasis: planningBasis || checklist || guideTitle || '최종 기획안 기반으로 생성된 촬영가이드입니다.',
      visualSubject: visual,
      shotType,
      cameraAction,
      transition,
      mustShow,
      forbiddenMoves,
      audioNarration: narration,
      mustSay,
      subtitleText: caption,
      directorNote: planningBasis,
      emotionTarget,
      proofRequirement,
      proofInsertion,
    },
    endTimeSec,
  }
}

function mapValueToShootingGuide(
  value: unknown,
  scriptPreview: string
): ShootingGuide | null {
  const rootRecord = asRecord(value)
  const guideTitle = rootRecord
    ? readString(rootRecord, ['title', 'guide_title', 'guideTitle', 'name'])
    : ''
  const sceneRecords = sceneRecordsFromValue(value)

  if (sceneRecords.length === 0) return null

  let cursorSec = 0
  const scenes = sceneRecords.map((scene, index): ShootingScene => {
    const mapped = mapSceneRecordToShootingScene(scene, index, scriptPreview, guideTitle, cursorSec)
    cursorSec = mapped.endTimeSec
    return mapped.scene
  })

  return { scenes }
}

function mapGuidePreviewToShootingGuide(
  guidePreview: Record<string, unknown> | null,
  scriptPreview: string
): ShootingGuide | null {
  const candidates = [
    guidePreview,
    parseJsonPreview(scriptPreview),
    sceneRecordsFromText(scriptPreview),
  ]

  for (const candidate of candidates) {
    const shootingGuide = mapValueToShootingGuide(candidate, scriptPreview)
    if (shootingGuide) return shootingGuide
  }

  return null
}

// --- DTO → Domain Model ---

export function mapGeneration(dto: GenerationResponseDto): Generation {
  const scriptPreview = dto.scriptPreview ?? ''
  const guidePreview = dto.guidePreview ?? null
  const projectStatus = dto.projectStatus ?? null
  const currentStep = dto.currentStep ?? null

  return {
    projectId: dto.projectId ?? null,
    generationRequestId: dto.generationRequestId,
    briefVersionId: dto.briefVersionId ?? null,
    generationStatus: dto.generationStatus,
    workflow: createGenerationWorkflow(dto.generationStatus),
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
    projectStatus,
    currentStep,
    projectWorkflow: createProjectWorkflow({
      status: projectStatus,
      currentStep,
    }),
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
