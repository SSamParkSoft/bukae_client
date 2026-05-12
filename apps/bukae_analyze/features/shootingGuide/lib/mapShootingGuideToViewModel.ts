import type { ShootingGuide } from '@/lib/types/domain'
import type {
  ShootingGuideViewModel,
  ShootingSceneContentItemViewModel,
  ShootingSceneViewModel,
} from '../types/viewModel'

function formatSceneName(name: string): string {
  // "scene_1_hook" → "hook", "scene_2_problem" → "problem"
  return name.replace(/^scene_\d+_/, '')
}

function formatDirectorNote(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const sentences = trimmed
    .replace(/(세요|니다)\.\s+/g, '$1.\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  return sentences.length > 0 ? sentences : [trimmed]
}

function formatSentenceBreaks(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.length > 0 ? lines : [trimmed]
}

function toContentItem(
  label: string,
  value: string | string[] | undefined
): ShootingSceneContentItemViewModel | null {
  if (Array.isArray(value)) {
    const lines = value
      .flatMap(formatSentenceBreaks)
      .filter(Boolean)

    return lines.length > 0 ? { label, lines } : null
  }

  if (!value?.trim()) return null

  return {
    label,
    lines: formatSentenceBreaks(value),
  }
}

function compactItems(
  items: Array<ShootingSceneContentItemViewModel | null>
): ShootingSceneContentItemViewModel[] {
  return items.filter((item): item is ShootingSceneContentItemViewModel => item !== null)
}

export function mapShootingGuideToViewModel(domain: ShootingGuide): ShootingGuideViewModel {
  return {
    scenes: domain.scenes.map((scene): ShootingSceneViewModel => ({
      sceneLabel: `SCENE ${scene.sceneNumber} : ${formatSceneName(scene.sceneName)}`,
      durationLabel: `${scene.startTimeSec.toFixed(1)}s − ${scene.endTimeSec.toFixed(1)}s`,
      description: scene.description,
      visualGuideItems: compactItems([
        toContentItem('화면/피사체', scene.visualSubject ?? scene.visualGuide),
        toContentItem('샷 타입', scene.shotType),
        toContentItem('카메라', scene.cameraAction),
        toContentItem('전환', scene.transition),
        toContentItem('필수 노출', scene.mustShow),
        toContentItem('금지 연출', scene.forbiddenMoves),
      ]),
      audioScriptItems: compactItems([
        toContentItem('나레이션', scene.audioNarration ?? scene.audioScript),
        (() => {
          const item = toContentItem('필수 멘트', scene.mustSay)
          return item ? { ...item, withBullet: true } : null
        })(),
      ]),
      subtitleScriptItems: compactItems([
        toContentItem('자막', scene.subtitleText ?? scene.subtitleScript),
      ]),
      planningBasisItems: compactItems([
        (() => {
          const raw = scene.directorNote ?? scene.planningBasis
          if (!raw?.trim()) return null
          return { label: 'AI 디렉팅', lines: formatDirectorNote(raw), withBullet: true, withLeading: true }
        })(),
        toContentItem('감정 목표', scene.emotionTarget),
        toContentItem('증거 요구사항', scene.proofRequirement),
        toContentItem('증거 삽입', scene.proofInsertion),
      ]),
    })),
  }
}
