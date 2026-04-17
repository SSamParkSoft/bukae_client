interface Props {
  overview: string
}

export function VideoOverviewCard({ overview }: Props) {
  return (
    <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start px-6 pt-8 pb-[clamp(24px,2.5vw,48px)] w-full">
      <div className="flex flex-col gap-4 items-start w-full">
        <p className="text-[clamp(16px,1.04vw,20px)] font-medium tracking-[-0.04em] leading-[1.4] text-white/60">
          영상 오버뷰
        </p>
        <div className="flex items-center px-6 py-4 rounded-lg w-full">
          <p className="line-clamp-2 min-w-0 flex-1 wrap-break-word text-[clamp(16px,1.17vw,20px)] font-medium tracking-[-0.04em] text-white/80 leading-[1.4]">
            {overview}
          </p>
        </div>
      </div>
    </div>
  )
}
