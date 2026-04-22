import type { AiQuestionViewModel } from '@/features/aiPlanning/types/viewModel'
import { QuestionHeader, InsightBox, OptionButton, CustomTextInput } from './AiPlanningQuestionPrimitives'

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f']

interface Props {
  data: AiQuestionViewModel
}

export function CoreMessageQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q3" question="이 영상으로 전달하고 싶은 한 줄 메시지가 뭔가요?" />
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
        {data.hasCustomOption && (
          <OptionButton
            letter={LETTERS[data.options.length]}
            label="직접 입력"
            selected={data.selected === 'custom'}
            onClick={() => data.onSelect('custom')}
          />
        )}
      </div>
      {data.selected === 'custom' && (
        <CustomTextInput
          value={data.customValue}
          onChange={data.onCustomChange}
          placeholder="전달하고 싶은 메시지를 직접 입력해 주세요."
        />
      )}
    </div>
  )
}
