import { MOCK_SHOOTING_GUIDE } from '@/lib/mocks'
import { mapShootingGuideToViewModel } from '@/features/shootingGuide/hooks/viewmodel/useShootingGuideViewModel'
import { PageTitle } from '@/components/page/PageTitle'
import { SceneCard } from './_components/SceneCard'

export default function ShootingGuidePage() {
  const viewModel = mapShootingGuideToViewModel(MOCK_SHOOTING_GUIDE)

  return (
    <div className="px-8 pt-10 pb-16 space-y-4">
      <PageTitle
        title="촬영가이드 & 스크립트"
        description="분석 결과를 바탕으로 촬영 가이드와 스크립트를 제공해요."
      />
      {viewModel.scenes.map((scene) => (
        <SceneCard key={scene.sceneLabel} scene={scene} />
      ))}
    </div>
  )
}
