interface Props {
  comment: string
}

export function DirectorComment({ comment }: Props) {
  return (
    <div className="backdrop-blur-[2px] flex flex-col items-start px-6 w-full">
      <div className="flex flex-col items-start w-full">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          디렉터 코멘트
        </p>
        <div className="flex items-start gap-3 px-6 py-4 w-full">
          <span className="shrink-0 text-white/30 font-16-md"></span>
          <p className="min-w-0 flex-1 font-medium tracking-[-0.04em] text-white/80 italic font-16-md">
            {comment}
          </p>
          <span className="shrink-0 text-white/30 font-16-md self-end"></span>
        </div>
      </div>
    </div>
  )
}
