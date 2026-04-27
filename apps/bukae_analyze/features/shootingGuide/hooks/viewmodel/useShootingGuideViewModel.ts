import type { Generation, ShootingGuide, ShootingScene } from '@/lib/types/domain'
import type { ShootingGuideViewModel, ShootingSceneViewModel } from '../../types/viewModel'

export function mapShootingGuideToViewModel(domain: ShootingGuide): ShootingGuideViewModel {
  return {
    scenes: domain.scenes.map((scene): ShootingSceneViewModel => ({
      sceneLabel: `SCENE ${scene.sceneNumber} : ${scene.sceneName}`,
      durationLabel: `${scene.startTimeSec.toFixed(1)}s − ${scene.endTimeSec.toFixed(1)}s`,
      description: scene.description,
      visualGuide: scene.visualGuide,
      audioScript: scene.audioScript,
      subtitleScript: scene.subtitleScript,
      planningBasis: scene.planningBasis,
    })),
  }
}

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

function joinList(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map((item) => typeof item === 'string' ? item : '')
    .filter(Boolean)
    .join('\n')
}

export function mapGenerationToShootingGuide(generation: Generation): ShootingGuide | null {
  const guidePreview = generation.guidePreview
  const sceneRecords = Array.isArray(guidePreview?.scenes)
    ? guidePreview.scenes.map(asRecord).filter((scene): scene is Record<string, unknown> => scene !== null)
    : []

  if (sceneRecords.length === 0) return null

  let cursorSec = 0
  const scenes = sceneRecords.map((scene, index): ShootingScene => {
    const durationSec = asNumber(scene.duration_sec) || asNumber(scene.durationSec) || 3
    const sceneNumber = asNumber(scene.scene_no) || asNumber(scene.sceneNumber) || index + 1
    const narration = asString(scene.narration)
    const caption = asString(scene.caption)
    const checklist = joinList(scene.checklist)
    const props = joinList(scene.props)
    const startTimeSec = cursorSec
    const endTimeSec = cursorSec + durationSec
    cursorSec = endTimeSec

    return {
      sceneNumber,
      sceneName: asString(scene.title) || `Scene ${sceneNumber}`,
      startTimeSec,
      endTimeSec,
      description: asString(scene.visual) || asString(scene.description),
      visualGuide: [
        asString(scene.visual),
        props ? `소품: ${props}` : '',
        checklist ? `체크리스트:\n${checklist}` : '',
      ].filter(Boolean).join('\n\n'),
      audioScript: narration || generation.scriptPreview,
      subtitleScript: caption,
      planningBasis: checklist || asString(guidePreview?.title) || '최종 기획안 기반으로 생성된 촬영가이드입니다.',
    }
  })

  return { scenes }
}
