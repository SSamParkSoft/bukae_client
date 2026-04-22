import type { LabeledItemViewModel, StorySegmentViewModel } from '@/features/videoAnalysis/types/viewModel'

export function BulletSentenceList({
  sentences,
  className,
  itemClassName,
}: {
  sentences: string[]
  className?: string
  itemClassName?: string
}) {
  if (sentences.length === 0) return null

  return (
    <ul className={['m-0 list-none space-y-3 p-0', className].filter(Boolean).join(' ')} role="list">
      {sentences.map((line, i) => (
        <li key={`${i}-${line.slice(0, 48)}`} className="flex gap-2">
          <span className="shrink-0 select-none text-white/80" aria-hidden>
            •
          </span>
          <span className={['min-w-0 flex-1', itemClassName].filter(Boolean).join(' ')}>{line}</span>
        </li>
      ))}
    </ul>
  )
}

const sectionTitleClass =
  'font-medium tracking-[-0.04em] leading-[1.4] text-white/60 max-h-[20px]'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className={sectionTitleClass} style={{ fontSize: 'clamp(16px, 1.17vw, 20px)' }}>{children}</p>
}

export function StoryRow({ timeframe, title, description }: StorySegmentViewModel) {
  return (
    <div className="flex w-full items-center gap-4 rounded-lg px-6 py-4">
      <span className="min-w-[clamp(120px, 8.33vw, 150px)] shrink-0 whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-center font-medium tracking-[-0.04em] text-white backdrop-glass-strong" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        {timeframe}
      </span>
      <span className="shrink-0 whitespace-nowrap font-semibold tracking-[-0.04em] text-white/80" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
        {title}
      </span>
      <div className="min-w-0 flex-1" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        <BulletSentenceList
          sentences={description}
          itemClassName="whitespace-pre-line font-medium leading-[1.4] tracking-[-0.04em] text-white/80"
        />
      </div>
    </div>
  )
}

export function LabeledRow({ label, description }: LabeledItemViewModel) {
  return (
    <div className="flex w-full items-center gap-4 rounded-lg px-6 py-4">
      <span className="w-[clamp(5rem, 18vw, 10rem)] max-w-[72px] min-w-[70px] shrink-0 whitespace-nowrap rounded-lg bg-white/20 px-4 py-2 text-center font-medium tracking-[-0.04em] text-white" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        {label}
      </span>
      <div className="min-w-0 flex-1" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        <BulletSentenceList
          sentences={description}
          itemClassName="whitespace-pre-line font-medium leading-[1.4] tracking-[-0.04em] text-white/80"
        />
      </div>
    </div>
  )
}

export function ViralRow({ index, description }: { index: number; description: string }) {
  return (
    <div className="flex w-full items-center gap-4 border-b border-white/40 px-6 py-4">
      <span
        className="flex shrink-0 items-center justify-center rounded-lg bg-white/20 font-medium tracking-[-0.04em] text-white"
        style={{
          fontSize: 'clamp(14px, 0.9vw, 16px)',
          width: 'clamp(32px, 2.08vw, 44px)',
          height: 'clamp(32px, 2.08vw, 44px)',
        }}
      >
        {index + 1}
      </span>
      <p className="min-w-0 flex-1 font-medium leading-[1.4] tracking-[-0.04em] text-white/80" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        {description}
      </p>
    </div>
  )
}

export const glassPanelClass = 'backdrop-blur-[2px] bg-white/10'
