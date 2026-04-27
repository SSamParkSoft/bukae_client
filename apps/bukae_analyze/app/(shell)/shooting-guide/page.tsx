import { MOCK_SHOOTING_GUIDE } from '@/lib/mocks'
import {
  mapGenerationToShootingGuide,
  mapShootingGuideToViewModel,
} from '@/features/shootingGuide/hooks/viewmodel/useShootingGuideViewModel'
import { PageTitle } from '@/components/page/PageTitle'
import { getServerAccessToken } from '@/lib/server/authSession'
import { fetchGenerationBootstrap } from '@/lib/server/generationBootstrap'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { SceneCard } from './_components/SceneCard'

export default async function ShootingGuidePage({
  searchParams,
}: {
  searchParams: Promise<{
    generationRequestId?: string | string[]
    projectId?: string | string[]
  }>
}) {
  const { generationRequestId, projectId } = await searchParams
  const resolvedProjectId = resolveSingleSearchParam(projectId)
  const resolvedGenerationRequestId = resolveSingleSearchParam(generationRequestId)
  const accessToken = await getServerAccessToken()

  const generation = accessToken && resolvedProjectId && resolvedGenerationRequestId
    ? await fetchGenerationBootstrap({
      accessToken,
      projectId: resolvedProjectId,
      generationRequestId: resolvedGenerationRequestId,
    }).catch(() => null)
    : null
  const shootingGuide = generation ? mapGenerationToShootingGuide(generation) : null
  const viewModel = mapShootingGuideToViewModel(shootingGuide ?? MOCK_SHOOTING_GUIDE)

  return (
    <div className="px-8 pt-10 pb-16 space-y-4">
      <PageTitle
        title="촬영가이드 & 스크립트"
        description="분석 결과를 바탕으로 촬영 가이드와 스크립트를 제공해요."
      />
      {generation?.scriptPreview ? (
        <div className="rounded-xl border border-white/20 bg-white/10 p-6 text-white/80">
          <p className="mb-3 font-medium text-white">스크립트 원문</p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{generation.scriptPreview}</pre>
        </div>
      ) : null}
      {viewModel.scenes.map((scene) => (
        <SceneCard key={scene.sceneLabel} scene={scene} />
      ))}
    </div>
  )
}
