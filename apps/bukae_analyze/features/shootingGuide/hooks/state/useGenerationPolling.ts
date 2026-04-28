'use client'

import { useEffect, useState } from 'react'
import { getGeneration } from '@/lib/services/generations'
import { getGenerationFailureMessage, isGenerationCompleted } from '@/features/shootingGuide/lib/generationState'
import type { Generation } from '@/lib/types/domain'

const GENERATION_POLLING_INTERVAL_MS = 3000

export interface GenerationPollingState {
  generation: Generation | null
  errorMessage: string | null
}

export function useGenerationPolling(
  projectId: string | null,
  generationRequestId: string | null,
  initialGeneration: Generation | null
): GenerationPollingState {
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

  return { generation, errorMessage }
}
