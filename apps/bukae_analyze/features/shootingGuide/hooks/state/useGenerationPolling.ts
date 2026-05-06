'use client'

import { useQuery } from '@tanstack/react-query'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
import { getGeneration } from '@/lib/services/generations'
import { getGenerationFailureMessage, isGenerationCompleted } from '@/features/shootingGuide/lib/generationState'
import type { Generation } from '@/lib/types/domain'

const GENERATION_POLLING_INTERVAL_MS = 5000

export interface GenerationPollingState {
  generation: Generation | null
  error: ResolvedAppError | null
  generationFailureMessage: string | null
}

export function useGenerationPolling(
  projectId: string | null,
  generationRequestId: string | null,
  initialGeneration: Generation | null,
  initialError: ResolvedAppError | null
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
  const generationFailureMessage = getGenerationFailureMessage(generation)
  const queryError = query.error
    ? resolveAppError(query.error, 'generation_polling')
    : null
  const error = generationFailureMessage
    ? null
    : queryError ?? (!generation ? initialError : null)

  return { generation, error, generationFailureMessage }
}
