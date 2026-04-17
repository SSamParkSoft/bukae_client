interface Props {
  overview: string
}

export function VideoOverviewCard({ overview }: Props) {
  return (
    <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start px-6 pt-8 pb-12 w-full">
      <div className="flex flex-col gap-4 items-start w-full">
        <p className="font-20-md text-white/60">영상 오버뷰</p>
        <div className="flex items-center px-6 py-4 rounded-lg w-full">
          <p className="font-20-md text-white/80 leading-[1.8] flex-1 min-w-0">{overview}</p>
        </div>
      </div>
    </div>
  )
}
