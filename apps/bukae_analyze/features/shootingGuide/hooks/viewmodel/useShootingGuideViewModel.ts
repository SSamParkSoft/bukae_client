import { useMemo } from 'react'
import type { ShootingGuide } from '@/lib/types/domain'
import type { ShootingGuideViewModel, ShootingSceneViewModel } from '../../types/viewModel'

export function useShootingGuideViewModel(domain: ShootingGuide): ShootingGuideViewModel {
  return useMemo(() => ({
    scenes: domain.scenes.map((scene): ShootingSceneViewModel => ({
      sceneLabel: `SCENE ${scene.sceneNumber} : ${scene.sceneName}`,
      durationLabel: `${scene.startTimeSec.toFixed(1)}s − ${scene.endTimeSec.toFixed(1)}s`,
      description: scene.description,
      visualGuide: scene.visualGuide,
      audioScript: scene.audioScript,
      subtitleScript: scene.subtitleScript,
      planningBasis: scene.planningBasis,
    })),
  }), [domain])
}
