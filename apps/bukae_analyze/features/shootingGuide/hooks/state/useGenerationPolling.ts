'use client'

import { useQuery } from '@tanstack/react-query'
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
  const query = useQuery({
    queryKey: ['generation', projectId, generationRequestId],
    queryFn: () => getGeneration(projectId as string, generationRequestId as string),
    enabled: Boolean(projectId && generationRequestId),
    initialData: initialGeneration ?? undefined,
    refetchOnWindowFocus: false,
    refetchInterval: (queryState) => {
      const generation = queryState.state.data

      if (isGenerationCompleted(generation ?? null)) return false
      if (getGenerationFailureMessage(generation ?? null)) return false

      return GENERATION_POLLING_INTERVAL_MS
    },
  })

  const generation = query.data ?? null
  const errorMessage = getGenerationFailureMessage(generation) ?? (
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? '촬영가이드 생성 상태를 조회하지 못했습니다.'
        : null
  )

  return { generation, errorMessage }
}
