import Image from 'next/image'
import lodingIcon from '@/public/loding.svg'

export function AnalysisLoadingPanel({ className }: { className?: string }) {
  return (
    <div className={['shrink-0', className ?? ''].join(' ')}>
      <div className="relative h-[572px] w-[321.75px] overflow-hidden rounded-2xl bg-black flex items-center justify-center">
        {/* SVG 아이콘 */}
        <Image
          src={lodingIcon}
          alt="분석 중"
          width={140}
          height={140}
          className="opacity-80"
          priority
        />

        {/* 스캔 오버레이 */}
        <div
          className="absolute inset-x-0 h-[50%] pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            animation: 'scan 2s linear infinite',
          }}
        />
      </div>
    </div>
  )
}
