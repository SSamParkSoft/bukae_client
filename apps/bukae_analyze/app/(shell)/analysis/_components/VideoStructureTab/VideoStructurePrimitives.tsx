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

const sectionTitleClass = 'font-fluid-20-md text-white/60 max-h-[20px]'

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className={sectionTitleClass}>{children}</p>
}

export function StoryRow({ timeframe, title, description }: StorySegmentViewModel) {
  return (
    <div className="flex w-full items-center gap-4 rounded-lg px-6 py-4">
      <span className="min-w-[clamp(120px,8.33vw,150px)] shrink-0 whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-center font-fluid-16-md text-white">
        {timeframe}
      </span>
      <span className="shrink-0 whitespace-nowrap font-fluid-20-md text-white/80 text-center min-w-[clamp(80px,5.33vw,100px)] ">
        {title}
      </span>
      <div className="min-w-0 flex-1">
        <BulletSentenceList
          sentences={description}
          itemClassName="whitespace-pre-line font-fluid-16-md text-white/80"
        />
      </div>
    </div>
  )
}

export function LabeledRow({ label, description }: LabeledItemViewModel) {
  return (
    <div className="flex w-full items-center gap-4 rounded-lg px-6 py-4">
      <span className="w-[clamp(5rem,18vw,10rem)] max-w-[72px] min-w-[70px] shrink-0 whitespace-nowrap rounded-lg bg-white/20 px-4 py-2 text-center font-fluid-16-md text-white">
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <BulletSentenceList
          sentences={description}
          itemClassName="whitespace-pre-line font-fluid-16-md text-white/80"
        />
      </div>
    </div>
  )
}

export function ViralRow({ index, description }: { index: number; description: string }) {
  return (
    <div className="flex w-full items-center gap-4 border-b border-white/40 px-6 py-4">
      <span
        className="flex shrink-0 items-center justify-center rounded-lg bg-white/20 font-fluid-16-md text-white"
        style={{
          width: 'clamp(32px, 2.08vw, 44px)',
          height: 'clamp(32px, 2.08vw, 44px)',
        }}
      >
        {index + 1}
      </span>
      <p className="min-w-0 flex-1 font-fluid-16-md text-white/80">
        {description}
      </p>
    </div>
  )
}

export const glassPanelClass = 'backdrop-glass-soft bg-white/10'
