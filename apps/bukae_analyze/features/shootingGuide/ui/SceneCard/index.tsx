import type { ShootingSceneViewModel } from '@/features/shootingGuide/types/viewModel'
import { SceneContentItem } from './SceneContentItem'

function SceneCardHeader({
  sceneLabel,
  durationLabel,
  description,
}: {
  sceneLabel: string
  durationLabel: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
      <span className="font-medium text-white bg-white/10 rounded-lg px-6 py-4" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        {sceneLabel}&nbsp;&nbsp;({durationLabel})
      </span>
      <span className="tracking-[-0.04em] leading-[1.6] text-highlight bg-white/20 rounded-md px-4 py-2" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        {description}
      </span>
    </div>
  )
}

interface SceneCardProps {
  scene: ShootingSceneViewModel
}

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <div className="border border-white/40 rounded-xl overflow-hidden mb-6">
      <SceneCardHeader
        sceneLabel={scene.sceneLabel}
        durationLabel={scene.durationLabel}
        description={scene.description}
      />
      <div className="flex">
        <div className="w-3/5 p-6 space-y-10">
          <SceneContentItem title="비주얼 촬영 가이드" items={scene.visualGuideItems} columns={2} />
          <div className="h-px bg-white/20" />
          <div className="flex gap-10 items-stretch">
            <div className="min-w-0 flex-1">
              <SceneContentItem title="오디오 스크립트" items={scene.audioScriptItems} columns={2} />
            </div>
            <div className="w-px shrink-0 bg-white/20" aria-hidden />
            <div className="min-w-0 flex-1">
              <SceneContentItem title="자막 스크립트" items={scene.subtitleScriptItems} />
            </div>
          </div>
        </div>
        <div className="w-2/5 p-6 bg-white/20">
          <SceneContentItem title="기획 및 산출 근거" items={scene.planningBasisItems} />
        </div>
      </div>
    </div>
  )
}
