import type { SceneContentItemViewModel } from '@/features/shootingGuide/types/viewModel'

export function SceneContentItem({ title, content }: SceneContentItemViewModel) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-white/50">{title}</p>
      <p className="text-sm text-white leading-relaxed">{content}</p>
    </div>
  )
}
