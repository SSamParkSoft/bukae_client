import type { TextQuestionViewModel } from '../types/viewModel'
import { QuestionHeader } from './shared'

interface Props {
  data: TextQuestionViewModel
}

export function CoreMaterialQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q5" question="영상에 쓰일 핵심 소재는 무엇인가요?" />
      <textarea
        value={data.value}
        onChange={e => data.onChange(e.target.value)}
        placeholder="예: 다이어트 식단, 내가 직접 만든 핸드메이드 가방, 강아지와의 일상 등"
        rows={3}
        className="w-full px-4 py-3 rounded-lg border border-black/15 text-sm resize-none focus:outline-none focus:border-black/40 placeholder:text-black/25"
      />
    </div>
  )
}
