import type { AiQuestionViewModel } from '@/features/aiPlanning/types/viewModel'
import { QuestionHeader, InsightBox, OptionButton } from './shared'

const LETTERS = ['a', 'b', 'c', 'd']

interface Props {
  data: AiQuestionViewModel
}

export function CtaQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q5" question="시청자에게 어떤 행동을 유도하고 싶으신가요?" />
      <InsightBox text={data.referenceInsight} />
      <div className="flex flex-col gap-2">
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
