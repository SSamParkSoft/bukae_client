import type {
  VideoStructureViewModel,
  StorySegmentViewModel,
  LabeledItemViewModel,
} from '@/features/videoAnalysis/types/viewModel'

function StoryRow({ timeframe, title, description }: StorySegmentViewModel) {
  return (
    <div className="flex gap-4 items-center px-6 py-4 rounded-lg w-full">
      <span className="bg-white/10 backdrop-glass-strong rounded-full px-4 py-2 font-20-md text-white shrink-0 whitespace-nowrap min-w-[150px] text-center">
        {timeframe}
      </span>
      <span className="font-24-sm text-white/80 shrink-0 whitespace-nowrap">{title}</span>
      <p className="font-20-md text-white/80 leading-[1.8] flex-1 min-w-0 truncate">{description}</p>
    </div>
  )
}

function LabeledRow({ label, description }: LabeledItemViewModel) {
  return (
    <div className="flex gap-4 items-center px-6 py-4 rounded-lg w-full">
      <span className="bg-white/20 backdrop-glass-strong rounded-lg px-4 py-2 font-20-md text-white shrink-0 whitespace-nowrap min-w-[83px] text-center">
        {label}
      </span>
      <p className="font-20-md text-white/80 leading-[1.8] flex-1 min-w-0 truncate">{description}</p>
    </div>
  )
}

function ViralRow({ index, description }: { index: number; description: string }) {
  return (
    <div className="flex gap-4 items-center px-6 py-4 w-full border-b border-white/40">
      <span className="bg-white/20 backdrop-glass-strong rounded-lg px-4 py-2 font-20-md text-white shrink-0 w-11 h-11 text-center">
        {index + 1}
      </span>
      <p className="font-20-md text-white/80 leading-[1.8] flex-1 min-w-0">{description}</p>
    </div>
  )
}

interface Props {
  data: VideoStructureViewModel
}

export function VideoStructureDetailSections({ data }: Props) {
  return (
    <div className="flex flex-col gap-8 mt-8">
      {/* 스토리 전개 구성 */}
      <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start p-6 w-full">
        <div className="flex flex-col gap-4 items-start w-full">
          <p className="font-20-md text-white/60 max-h-[20px]">스토리 전개 구성</p>
          <div className="flex flex-col items-start w-full">
            {data.storyStructure.map((seg) => (
              <StoryRow key={seg.timeframe} {...seg} />
            ))}
          </div>
        </div>
      </div>

      {/* 편집 및 연출 포인트 + 바이럴 포인트 */}
      <div className="flex gap-10 items-start w-full">
        <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start p-6 shrink-0 w-[560px]">
          <div className="flex flex-col gap-4 items-start w-full">
            <p className="font-20-md text-white/60 max-h-[20px]">편집 및 연출 포인트</p>
            <div className="flex flex-col items-start w-full">
              {data.editingPoints.map((pt) => (
                <LabeledRow key={pt.label} {...pt} />
              ))}
            </div>
          </div>
        </div>
        <div className="backdrop-blur-[2px] bg-white/10 flex flex-col flex-1 min-w-0 items-start p-6 min-h-[388px]">
          <div className="flex flex-col gap-4 items-start w-full">
            <p className="font-20-md text-white/60 max-h-[20px]">바이럴 포인트</p>
            <div className="flex flex-col items-start w-full">
              {data.viralPoints.map((desc, i) => (
                <ViralRow key={i} index={i} description={desc} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 현재 트렌드 맥락 + CTA 전략 */}
      <div className="flex gap-10 items-start w-full">
        <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start px-6 pt-6 pb-[35px] w-[560px] shrink-0">
          <div className="flex flex-col gap-4 items-start w-full">
            <p className="font-20-md text-white/60 max-h-[20px]">현재 트렌드 맥락</p>
            <div className="flex flex-col gap-4 px-6 py-4 rounded-lg w-full">
              <p className="font-20-md text-white/80 leading-[1.8] p-2">{data.trendContextDescription}</p>
              <div className="flex items-center justify-between w-full gap-4">
                {data.trendInsights.map((insight) => (
                  <div
                    key={insight.label}
                    className="bg-white/10 backdrop-glass-strong rounded-lg px-6 py-4 flex-1"
                  >
                    <div className="flex flex-col max-h-[65px]">
                      <p className="font-28-md text-white">{insight.value}</p>
                      <p className="font-20-md text-white/60">{insight.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="backdrop-blur-[2px] bg-white/10 flex flex-col flex-1 min-w-0 items-start p-6">
          <div className="flex flex-col gap-4 items-start w-full">
            <p className="font-20-md text-white/60 max-h-[20px]">CTA 전략</p>
            <div className="flex flex-col items-start w-full">
              {data.ctaStrategy.map((item) => (
                <LabeledRow key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
