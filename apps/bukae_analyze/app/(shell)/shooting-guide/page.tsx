import { Suspense } from 'react'
import { PageTitle } from '@/components/page/PageTitle'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
import { getServerAccessToken } from '@/lib/server/authSession'
import { fetchGenerationBootstrap } from '@/lib/server/generationBootstrap'
import type { Generation } from '@/lib/types/domain'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { ShootingGuidePageClient } from '@/features/shootingGuide'
import type { FeedbackPromptContent } from '@/components/feedback/FeedbackPromptBanner'

type ShootingGuideSearchParams = Promise<{
  briefVersionId?: string | string[]
  generationRequestId?: string | string[]
  projectId?: string | string[]
}>

const SHOOTING_GUIDE_FEEDBACK_PROMPT: FeedbackPromptContent = {
  promptId: 'shooting-guide',
  title: '촬영가이드가 도움이 됐는지 알려주세요',
  description: '남겨주신 의견은 다음 가이드 품질을 개선하는 데 바로 참고할게요.',
}

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
      feedbackPrompt={SHOOTING_GUIDE_FEEDBACK_PROMPT}
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
