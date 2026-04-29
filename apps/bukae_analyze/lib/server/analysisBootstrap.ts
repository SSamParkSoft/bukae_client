import 'server-only'

import { getBenchmarkAnalysisWithFetcher } from '@/lib/services/benchmarkAnalysis'
import { getProjectPollingStateWithFetcher } from '@/lib/services/projects'
import {
  createAnalysisResourceSnapshot,
  type AnalysisResourceSnapshotState,
} from '@/features/analysisPage/lib/analysisResource'
import { createServerApiFetcher } from '@/lib/server/apiClient'

export async function fetchAnalysisBootstrap(params: {
  accessToken: string
  projectId: string
}): Promise<AnalysisResourceSnapshotState> {
  const { accessToken, projectId } = params
  const fetcher = createServerApiFetcher(accessToken)

  const [project, snapshot] = await Promise.all([
    getProjectPollingStateWithFetcher(fetcher, projectId),
    getBenchmarkAnalysisWithFetcher(fetcher, projectId),
  ])

  return createAnalysisResourceSnapshot({
    project,
    snapshot,
  })
}
