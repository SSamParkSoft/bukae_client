import { AnalyzeHomeHeroCopy } from '@/app/_components/AnalyzeHomeHeroCopy'
import { AnalyzeHomeEntry } from '@/app/_components/AnalyzeHomeEntry'

export default function AnalyzeHomePage() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center" style={{ marginTop: 'clamp(80px, 6.67vw, 128px)' }}>
      <div className="flex w-full flex-col items-center" style={{ gap: 'clamp(32px, 2.5vw, 48px)' }}>
        <AnalyzeHomeHeroCopy />
        <AnalyzeHomeEntry />
      </div>
    </div>
  )
}
