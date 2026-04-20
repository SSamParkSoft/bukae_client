import { useMemo } from 'react'
import type { ShootingGuide } from '@/lib/types/domain'
import type { ShootingGuideViewModel, ShootingSceneViewModel } from '../../types/viewModel'

export function useShootingGuideViewModel(domain: ShootingGuide): ShootingGuideViewModel {
  return useMemo(() => ({
    scenes: domain.scenes.map((scene): ShootingSceneViewModel => ({
      sceneLabel: `SCENE ${scene.sceneNumber} : ${scene.sceneName}`,
      durationLabel: `${scene.startTimeSec.toFixed(1)}s − ${scene.endTimeSec.toFixed(1)}s`,
      description: scene.description,
      contentItems: [
        { title: '비주얼 촬영 가이드', content: scene.visualGuide },
        { title: '자막 스크립트', content: scene.subtitleScript },
        { title: '오디오 스크립트', content: scene.audioScript },
      ],
    })),
  }), [domain])
}
