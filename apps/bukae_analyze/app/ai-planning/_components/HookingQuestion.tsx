import type { AiQuestionViewModel } from '@/features/aiPlanning/types/viewModel'
import { QuestionHeader, InsightBox, OptionButton, CustomTextInput } from './shared'

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f']

interface Props {
  data: AiQuestionViewModel
}

export function HookingQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q1" question="이 영상의 시작 방식 중 어떤 점을 가져가고 싶으신가요?" />
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
          placeholder="강조하고 싶은 후킹 방식을 입력해 주세요."
        />
      )}
    </div>
  )
}
