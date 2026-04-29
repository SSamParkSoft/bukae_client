import 'server-only'

import type { PlanningSession } from '@/lib/types/domain'
import { getPlanningSessionWithFetcher } from '@/lib/services/planning'
import { createServerApiFetcher } from '@/lib/server/apiClient'

export async function fetchPlanningBootstrap(params: {
  accessToken: string
  projectId: string
}): Promise<PlanningSession> {
  const { accessToken, projectId } = params
  const fetcher = createServerApiFetcher(accessToken)

  return getPlanningSessionWithFetcher(fetcher, projectId)
}
