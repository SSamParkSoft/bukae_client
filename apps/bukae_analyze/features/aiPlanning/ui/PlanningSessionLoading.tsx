import { LoadingLogoBlock } from '@/components/loading/LoadingLogoBlock'

export function PlanningSessionLoading() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-6 px-6 pb-32 text-center">
      <LoadingLogoBlock size={160} />
      <div className="flex flex-col gap-2">
        <p className="font-fluid-24-md text-white">PT1 질문을 준비하고 있습니다</p>
        <p className="font-fluid-16-rg text-white/60">
          분석 결과를 바탕으로 필요한 추가 질문을 생성하고 있어요.
        </p>
      </div>
    </div>
  )
}
