import type { AiQuestionViewModel } from '@/features/aiPlanning/types/viewModel'
import { QuestionHeader, InsightBox, OptionButton } from './AiPlanningQuestionPrimitives'

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

interface Props {
  data: AiQuestionViewModel
}

export function AudienceReactionQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q4" question="어떤 반응을 노리고 싶으신가요?" />
      <InsightBox text={data.referenceInsight} />
      <div className="grid grid-cols-2 gap-2">
        {data.options.map((option, i) => (
          <OptionButton
            key={option.value}
            letter={LETTERS[i]}
            label={option.label}
            selected={data.selected === option.value}
            onClick={() => data.onSelect(option.value)}
          />
        ))}
      </div>
    </div>
  )
}
