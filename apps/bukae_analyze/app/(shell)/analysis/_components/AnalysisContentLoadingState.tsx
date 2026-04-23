import { AnalysisLoadingPanel } from './AnalysisLoadingPanel'

function LoadingBlock({
  className,
}: {
  className?: string
}) {
  return (
    <div
      className={[
        'animate-pulse rounded-full bg-white/8',
        className ?? '',
      ].join(' ')}
      aria-hidden
    />
  )
}

export function AnalysisContentLoadingState() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-10 pt-10 pb-32">
      <div className="flex min-w-0 gap-x-[38.25px]">
        <AnalysisLoadingPanel />

        <div className="flex h-[572px] min-w-0 max-w-[1000px] flex-1 flex-col">
          <div className="flex gap-4 border-b border-white/10 px-2 pb-4">
            <LoadingBlock className="h-8 w-32" />
            <LoadingBlock className="h-8 w-28" />
            <LoadingBlock className="h-8 w-40" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-6 px-6 pt-8">
            <div className="flex flex-col gap-4">
              <LoadingBlock className="h-5 w-40" />
              <div className="grid grid-cols-2 gap-4">
                <LoadingBlock className="h-18 rounded-2xl" />
                <LoadingBlock className="h-18 rounded-2xl" />
                <LoadingBlock className="h-18 rounded-2xl" />
                <LoadingBlock className="h-18 rounded-2xl" />
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-8">
              <LoadingBlock className="h-5 w-32" />
              <LoadingBlock className="h-4 w-full rounded-lg" />
              <LoadingBlock className="h-4 w-11/12 rounded-lg" />
              <LoadingBlock className="h-4 w-9/12 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-[28px] border border-white/8 bg-white/[0.03] px-6 py-8">
        <LoadingBlock className="h-5 w-24" />
        <LoadingBlock className="h-4 w-full rounded-lg" />
        <LoadingBlock className="h-4 w-10/12 rounded-lg" />
        <LoadingBlock className="h-4 w-8/12 rounded-lg" />
      </div>
    </div>
  )
}
