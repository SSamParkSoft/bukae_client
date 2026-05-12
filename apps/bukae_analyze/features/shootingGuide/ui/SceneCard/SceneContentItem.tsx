import type { ShootingSceneContentItemViewModel } from '@/features/shootingGuide/types/viewModel'

interface SceneContentItemProps {
  title: string
  items: ShootingSceneContentItemViewModel[]
  columns?: 1 | 2 | '6/4'
}

export function SceneContentItem({ title, items, columns = 1 }: SceneContentItemProps) {
  if (items.length === 0) return null

  const listClassName =
    columns === 2 ? 'grid grid-cols-1 gap-y-3 sm:grid-cols-2' :
    columns === '6/4' ? 'grid grid-cols-1 gap-y-3 sm:grid-cols-[6fr_4fr]' :
    'grid grid-cols-1 gap-y-3'

  return (
    <div className="space-y-2">
      <p className="tracking-[-0.04em] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>{title}</p>
      <div className={listClassName}>
        {items.map((item) => (
          <div
            key={item.label}
            className="space-y-1 px-4"
          >
            <p className="whitespace-nowrap text-highlight tracking-[-0.04em] leading-[1.6]" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
              {item.label}
            </p>
            {item.withBullet ? (
              <ul className={`min-w-0 list-none ${item.withLeading ? 'space-y-3' : 'space-y-1'}`} role="list">
                {item.lines.map((line, index) => (
                  <li key={`${item.label}-${index}`} className="flex gap-2">
                    <span className="shrink-0 select-none text-white/80" aria-hidden>•</span>
                    <span
                      className="min-w-0 flex-1 whitespace-pre-line tracking-[-0.04em] leading-[1.8] text-white"
                      style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
                    >
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="min-w-0 space-y-1">
                {item.lines.map((line, index) => (
                  <p
                    key={`${item.label}-${index}`}
                    className="whitespace-pre-line tracking-[-0.04em] leading-[1.6] text-white"
                    style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
