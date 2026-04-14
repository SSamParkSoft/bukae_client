import type { HookAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { SectionLabel } from '../shared'

export function HookOptionalFields({ data }: { data: HookAnalysisViewModel }) {
  if (!data.viewerPositioning && !data.visualHook && !data.firstSentence) return null
  return (
    <div className="space-y-4 p-4 rounded-xl bg-black/[0.03] border border-black/[0.06]">
      {data.viewerPositioning && (
        <div>
          <SectionLabel>시청자 포지셔닝</SectionLabel>
          <p className="text-sm">{data.viewerPositioning}</p>
        </div>
      )}
      {data.visualHook && (
        <div>
          <SectionLabel>시각적 훅</SectionLabel>
          <p className="text-sm">{data.visualHook}</p>
        </div>
      )}
      {data.firstSentence && (
        <div>
          <SectionLabel>첫 문장</SectionLabel>
          <p className="text-sm italic text-black/70">{`"${data.firstSentence}"`}</p>
        </div>
      )}
    </div>
  )
}
