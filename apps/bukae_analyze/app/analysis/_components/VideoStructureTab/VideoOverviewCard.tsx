interface Props {
  overview: string
}

export function VideoOverviewCard({ overview }: Props) {
  return (
    <div className="backdrop-blur-[2px] flex flex-col items-start px-6 pt-6 w-full">
      <div className="flex flex-col items-start w-full">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          한 줄 기획 요약
        </p>
        <div className="flex items-center px-6 py-4 w-full">
          <p className="line-clamp-2 min-w-0 flex-1 wrap-break-word font-medium tracking-[-0.04em] text-white/80 font-16-rg">
            {overview}
          </p>
        </div>
      </div>
    </div>
  )
}
