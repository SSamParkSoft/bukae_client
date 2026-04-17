import { glassPanelClass, SectionTitle, ViralRow } from './shared'

interface Props {
  points: string[]
}

export function ViralPointsSection({ points }: Props) {
  return (
    <div
      className={`${glassPanelClass} flex h-full min-h-[388px] min-w-0 flex-1 flex-col items-start p-6`}
    >
      <div className="flex h-full min-h-0 w-full flex-col items-start gap-4">
        <SectionTitle>바이럴 포인트</SectionTitle>
        <div className="flex w-full flex-col items-start">
          {points.map((desc, i) => (
            <ViralRow key={i} index={i} description={desc} />
          ))}
        </div>
      </div>
    </div>
  )
}
