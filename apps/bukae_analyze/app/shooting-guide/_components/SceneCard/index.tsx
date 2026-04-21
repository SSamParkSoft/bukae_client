import type { ShootingSceneViewModel } from '@/features/shootingGuide/types/viewModel'
import { SceneContentItem } from './SceneContentItem'

interface SceneCardProps {
  scene: ShootingSceneViewModel
}

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <div className="border border-white/10 rounded-xl px-6 py-5 space-y-6">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white bg-white/10 rounded-lg px-6 py-4" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
          {scene.sceneLabel}&nbsp;&nbsp;({scene.durationLabel})
        </span>
        <span className="tracking-[-0.04em] leading-[1.6] text-highlight bg-white/10 rounded-lg px-4 py-2" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
          {scene.description}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {scene.contentItems.map((item) => (
          <SceneContentItem key={item.title} title={item.title} content={item.content} />
        ))}
      </div>
    </div>
  )
}
