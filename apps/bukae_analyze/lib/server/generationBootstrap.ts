import 'server-only'

import type { Generation } from '@/lib/types/domain'
import { getGenerationWithFetcher } from '@/lib/services/generations'
import { createServerApiFetcher } from './apiClient'

export async function fetchGenerationBootstrap(params: {
  accessToken: string
  projectId: string
  generationRequestId: string
}): Promise<Generation> {
  const { accessToken, projectId, generationRequestId } = params
  const fetcher = createServerApiFetcher(accessToken)

  return getGenerationWithFetcher(fetcher, projectId, generationRequestId)
}
