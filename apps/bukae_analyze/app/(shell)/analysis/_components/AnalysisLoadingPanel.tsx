import { LoadingLogoBlock } from '@/components/loading/LoadingLogoBlock'

export function AnalysisLoadingPanel({ className }: { className?: string }) {
  return (
    <div className={['shrink-0', className ?? ''].join(' ')}>
      <div className="relative h-[572px] w-[321.75px] overflow-hidden rounded-2xl bg-black/10 flex items-center justify-center">
        <LoadingLogoBlock size={140} />
      </div>
    </div>
  )
}
