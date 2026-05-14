import { Suspense } from 'react'
import { PageTitle } from '@/components/page/PageTitle'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
import { getServerAccessToken } from '@/lib/server/authSession'
import { fetchGenerationBootstrap } from '@/lib/server/generationBootstrap'
import type { Generation } from '@/lib/types/domain'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { ShootingGuidePageClient } from '@/features/shootingGuide'

type ShootingGuideSearchParams = Promise<{
  briefVersionId?: string | string[]
  generationRequestId?: string | string[]
  projectId?: string | string[]
}>

function ShootingGuideContentLoading() {
  return (
    <div className="relative min-h-[640px]">
      <AnalysisLoadingOverlay
        visible
        label="촬영가이드와 스크립트를 불러오는 중입니다."
      />
    </div>
  )
}

async function ShootingGuideContent({
  searchParams,
}: {
  searchParams: ShootingGuideSearchParams
}) {
  const { briefVersionId, generationRequestId, projectId } = await searchParams
  const resolvedBriefVersionId = resolveSingleSearchParam(briefVersionId)
  const resolvedProjectId = resolveSingleSearchParam(projectId)
  const resolvedGenerationRequestId = resolveSingleSearchParam(generationRequestId)
  const accessToken = await getServerAccessToken()

  let generation: Generation | null = null
  let initialError: ResolvedAppError | null = null

  if (accessToken && resolvedProjectId && resolvedGenerationRequestId) {
    try {
      generation = await fetchGenerationBootstrap({
        accessToken,
        projectId: resolvedProjectId,
        generationRequestId: resolvedGenerationRequestId,
      })
    } catch (error) {
      initialError = resolveAppError(error, 'generation_bootstrap')
    }
  }

  return (
    <ShootingGuidePageClient
      projectId={resolvedProjectId}
      briefVersionId={resolvedBriefVersionId}
      generationRequestId={resolvedGenerationRequestId}
      initialGeneration={generation}
      initialError={initialError}
    />
  )
}

export default function ShootingGuidePage({
  searchParams,
}: {
  searchParams: ShootingGuideSearchParams
}) {
  return (
    <div className="px-8 pt-10 pb-16 space-y-4">
      <PageTitle
        title="촬영가이드 & 스크립트"
        description="분석 결과를 바탕으로 촬영 가이드와 스크립트를 제공해요."
      />
      <Suspense fallback={<ShootingGuideContentLoading />}>
        <ShootingGuideContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
