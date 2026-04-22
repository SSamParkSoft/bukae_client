import { FileVideo } from 'lucide-react'
import type { TextQuestionViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader } from './PlanningSetupPrimitives'

interface Props {
  data: TextQuestionViewModel
}

export function CoreMaterialQuestion({ data }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={FileVideo}
        title="영상 소스"
        subtitle="영상에 쓰일 핵심 소재는 무엇인가요?"
      />
      <textarea
        value={data.value}
        onChange={e => data.onChange(e.target.value)}
        placeholder="예: 다이어트 식단, 내가 직접 만든 핸드메이드 가방, 강아지와의 일상 등"
        rows={5}
        className="w-full px-6 py-4 rounded-lg border border-white/40 bg-transparent font-normal tracking-[-0.04em] leading-[1.4] text-white/80 resize-none focus:outline-none focus:border-white/60 placeholder:text-white/35"
        style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}
      />
    </div>
  )
}
