'use client'

import { useMemo } from 'react'
import { mapShootingGuideToViewModel } from '@/features/shootingGuide/lib/mapShootingGuideToViewModel'
import { useGenerationPolling } from '@/features/shootingGuide/hooks/state/useGenerationPolling'
import { getGenerationStatusMessage, isGenerationCompleted } from '@/features/shootingGuide/lib/generationState'
import { SceneCard } from './SceneCard'
import type { Generation } from '@/lib/types/domain'

export function ShootingGuidePageClient({
  projectId,
  generationRequestId,
  initialGeneration,
}: {
  projectId: string | null
  generationRequestId: string | null
  initialGeneration: Generation | null
}) {
  const { generation, errorMessage } = useGenerationPolling(projectId, generationRequestId, initialGeneration)

  const shootingGuide = useMemo(() => (
    generation && isGenerationCompleted(generation)
      ? generation.shootingGuide
      : null
  ), [generation])
  const viewModel = useMemo(() => (
    shootingGuide ? mapShootingGuideToViewModel(shootingGuide) : null
  ), [shootingGuide])

  if (!projectId || !generationRequestId) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-8 text-white">
        <p className="text-lg font-medium">촬영가이드 생성 정보를 찾을 수 없습니다.</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          이전 단계에서 촬영가이드 생성을 시작한 뒤 다시 진입해 주세요.
        </p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-6 text-red-100">
        <p className="font-medium">촬영가이드 생성 중 문제가 발생했습니다.</p>
        <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
      </div>
    )
  }

  if (!shootingGuide || !viewModel) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-8 text-white">
        <p className="text-lg font-medium">{getGenerationStatusMessage(generation)}</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          생성이 완료되면 이 화면에서 촬영가이드와 스크립트가 자동으로 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      {viewModel.scenes.map((scene) => (
        <SceneCard key={scene.sceneLabel} scene={scene} />
      ))}
    </>
  )
}
