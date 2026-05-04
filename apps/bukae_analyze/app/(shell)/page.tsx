import { AnalyzeHomeHeroCopy } from '@/app/_components/AnalyzeHomeHeroCopy'
import { AnalyzeHomeBenchmarkSubmission } from '@/app/_components/AnalyzeHomeBenchmarkSubmission'
import { AnalyzeHomeStorageReset } from '@/app/_components/AnalyzeHomeStorageReset'

export default function AnalyzeHomePage() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center" style={{ marginTop: 'clamp(80px, 6.67vw, 128px)' }}>
      <AnalyzeHomeStorageReset />
      <div className="flex w-full flex-col items-center" style={{ gap: 'clamp(32px, 2.5vw, 48px)' }}>
        <AnalyzeHomeHeroCopy />
        <AnalyzeHomeBenchmarkSubmission />
      </div>
    </div>
  )
}
