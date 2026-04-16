import type { ShootingSceneViewModel } from '@/features/shootingGuide/types/viewModel'
import { SceneContentItem } from './SceneContentItem'

interface SceneCardProps {
  scene: ShootingSceneViewModel
}

export function SceneCard({ scene }: SceneCardProps) {
  return (
    <div className="border border-white/10 rounded-xl px-6 py-5 space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white bg-white/10 rounded-lg px-3 py-1.5">
          {scene.sceneLabel}&nbsp;&nbsp;({scene.durationLabel})
        </span>
        <span className="text-sm text-white/60 bg-white/10 rounded-lg px-3 py-1.5">
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
