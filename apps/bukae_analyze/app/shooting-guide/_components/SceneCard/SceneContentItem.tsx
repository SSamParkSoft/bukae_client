import type { SceneContentItemViewModel } from '@/features/shootingGuide/types/viewModel'

export function SceneContentItem({ title, content }: SceneContentItemViewModel) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-black/50">{title}</p>
      <p className="text-sm text-black leading-relaxed">{content}</p>
    </div>
  )
}
