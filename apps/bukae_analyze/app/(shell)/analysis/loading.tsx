import { LoadingLogoBlock } from '@/components/loading/LoadingLogoBlock'
import { PageTitle } from '@/components/page/PageTitle'

export default function AnalysisLoading() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <div className="mb-10 h-[52px] rounded-2xl bg-white/8 backdrop-blur-[2px]" />
      <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
      <hr className="mb-10 border-b border-white/10" />

      <div className="flex min-w-0 flex-1 flex-col pt-10 pb-32">
        <div className="relative flex min-w-0 gap-x-[38.25px]">
          <div className="relative flex h-[572px] w-[321.75px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/10">
            <LoadingLogoBlock size={140} />
          </div>

          <div className="flex h-[572px] min-w-0 max-w-[1000px] flex-1 flex-col gap-6">
            <div className="h-14 rounded-2xl bg-white/8 backdrop-blur-[2px]" />
            <div className="flex-1 rounded-2xl bg-white/6 backdrop-blur-[2px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
