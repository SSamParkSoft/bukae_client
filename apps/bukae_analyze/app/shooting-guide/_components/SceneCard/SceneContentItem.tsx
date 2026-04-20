import type { SceneContentItemViewModel } from '@/features/shootingGuide/types/viewModel'

export function SceneContentItem({ title, content }: SceneContentItemViewModel) {
  return (
    <div className="space-y-2">
      <p className="tracking-[-0.04em] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>{title}</p>
      <p className="tracking-[-0.04em] leading-[1.6] text-white" style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}>{content}</p>
    </div>
  )
}
