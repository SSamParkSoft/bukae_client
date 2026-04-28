import type { ShootingGuide } from '@/lib/types/domain'
import type {
  ShootingGuideViewModel,
  ShootingSceneContentItemViewModel,
  ShootingSceneViewModel,
} from '../types/viewModel'

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
      sceneLabel: `SCENE ${scene.sceneNumber} : ${scene.sceneName}`,
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
        toContentItem('필수 멘트', scene.mustSay),
      ]),
      subtitleScriptItems: compactItems([
        toContentItem('자막', scene.subtitleText ?? scene.subtitleScript),
      ]),
      planningBasisItems: compactItems([
        toContentItem('AI 디렉팅', scene.directorNote ?? scene.planningBasis),
        toContentItem('감정 목표', scene.emotionTarget),
        toContentItem('증거 요구사항', scene.proofRequirement),
        toContentItem('증거 삽입', scene.proofInsertion),
      ]),
    })),
  }
}
