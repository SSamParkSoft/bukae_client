import { BulletSentenceList } from './VideoStructurePrimitives'

interface Props {
  comment: string[]
}

export function DirectorComment({ comment }: Props) {
  return (
    <div className="backdrop-glass-soft flex flex-col items-start px-6 w-full">
      <div className="flex flex-col items-start w-full">
        <p className="font-fluid-20-md text-white/60">
          디렉터 코멘트
        </p>
        <div className="flex items-start gap-3 px-6 py-4 w-full">
          <span className="shrink-0 text-white/30 font-fluid-20-md"></span>
          <div className="min-w-0 flex-1 font-fluid-20-md">
            <BulletSentenceList
              sentences={comment}
              itemClassName="whitespace-pre-line font-fluid-20-md text-white/80 italic"
            />
          </div>
          <span className="shrink-0 text-white/30 font-16-md self-end"></span>
        </div>
      </div>
    </div>
  )
}
