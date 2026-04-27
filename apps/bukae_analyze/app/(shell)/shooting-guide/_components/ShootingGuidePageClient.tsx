'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  mapGenerationToShootingGuide,
  mapShootingGuideToViewModel,
} from '@/features/shootingGuide/hooks/viewmodel/useShootingGuideViewModel'
import { getGeneration } from '@/lib/services/generations'
import { MOCK_SHOOTING_GUIDE } from '@/lib/mocks'
import { SceneCard } from './SceneCard'
import type { Generation } from '@/lib/types/domain'

const GENERATION_POLLING_INTERVAL_MS = 3000

function isGenerationCompleted(generation: Generation | null): boolean {
  return (
    generation?.generationStatus === 'COMPLETED' ||
    generation?.projectStatus === 'GENERATION_COMPLETED'
  )
}

function getGenerationFailureMessage(generation: Generation | null): string | null {
  if (!generation) return null
  if (
    !generation.failure &&
    generation.generationStatus !== 'FAILED' &&
    !generation.lastErrorCode &&
    !generation.lastErrorMessage
  ) {
    return null
  }

  return (
    generation.failure?.summary ??
    generation.lastErrorMessage ??
    generation.lastErrorCode ??
    '촬영가이드 생성에 실패했습니다.'
  )
}

function getStatusMessage(generation: Generation | null): string {
  switch (generation?.generationStatus) {
    case 'GENERATING_GUIDE':
      return '촬영가이드를 생성 중입니다.'
    case 'GENERATING_SCRIPT':
      return '스크립트를 생성 중입니다.'
    case 'REVIEWING':
      return '생성 결과를 검토 중입니다.'
    case 'PREPARING':
    default:
      return '촬영가이드와 스크립트 생성을 준비 중입니다.'
  }
}

export function ShootingGuidePageClient({
  projectId,
  generationRequestId,
  initialGeneration,
}: {
  projectId: string | null
  generationRequestId: string | null
  initialGeneration: Generation | null
}) {
  const [generation, setGeneration] = useState<Generation | null>(initialGeneration)
  const [errorMessage, setErrorMessage] = useState<string | null>(() => (
    getGenerationFailureMessage(initialGeneration)
  ))

  useEffect(() => {
    if (!projectId || !generationRequestId) return
    if (isGenerationCompleted(generation)) return
    if (getGenerationFailureMessage(generation)) return

    let cancelled = false
    let timerId: number | null = null

    async function pollGeneration() {
      try {
        const nextGeneration = await getGeneration(projectId as string, generationRequestId as string)
        if (cancelled) return

        setGeneration(nextGeneration)
        const failureMessage = getGenerationFailureMessage(nextGeneration)
        if (failureMessage) {
          setErrorMessage(failureMessage)
          return
        }
        if (isGenerationCompleted(nextGeneration)) {
          setErrorMessage(null)
          return
        }

        timerId = window.setTimeout(pollGeneration, GENERATION_POLLING_INTERVAL_MS)
      } catch (error) {
        if (cancelled) return
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '촬영가이드 생성 상태를 조회하지 못했습니다.'
        )
      }
    }

    timerId = window.setTimeout(pollGeneration, GENERATION_POLLING_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerId !== null) {
        window.clearTimeout(timerId)
      }
    }
  }, [generation, generationRequestId, projectId])

  const shootingGuide = useMemo(() => (
    generation && isGenerationCompleted(generation)
      ? mapGenerationToShootingGuide(generation)
      : null
  ), [generation])
  const viewModel = useMemo(() => (
    mapShootingGuideToViewModel(shootingGuide ?? MOCK_SHOOTING_GUIDE)
  ), [shootingGuide])

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-6 text-red-100">
        <p className="font-medium">촬영가이드 생성 중 문제가 발생했습니다.</p>
        <p className="mt-2 text-sm text-red-100/80">{errorMessage}</p>
      </div>
    )
  }

  if (projectId && generationRequestId && !shootingGuide) {
    return (
      <div className="rounded-xl border border-white/20 bg-white/10 p-8 text-white">
        <p className="text-lg font-medium">{getStatusMessage(generation)}</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          생성이 완료되면 이 화면에서 촬영가이드와 스크립트가 자동으로 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      {generation?.scriptPreview ? (
        <div className="rounded-xl border border-white/20 bg-white/10 p-6 text-white/80">
          <p className="mb-3 font-medium text-white">스크립트 원문</p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{generation.scriptPreview}</pre>
        </div>
      ) : null}
      {viewModel.scenes.map((scene) => (
        <SceneCard key={scene.sceneLabel} scene={scene} />
      ))}
    </>
  )
}
