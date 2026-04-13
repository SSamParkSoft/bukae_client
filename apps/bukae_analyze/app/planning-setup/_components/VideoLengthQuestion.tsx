import type { VideoLength } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { QuestionHeader, OptionButton, CustomTextInput } from './shared'

const OPTIONS: { value: VideoLength; label: string }[] = [
  { value: 'under-15s', label: '15초 이내' },
  { value: '15-30s', label: '15~30초' },
  { value: '30-45s', label: '30~45초' },
  { value: '45-60s', label: '45~60초' },
]

interface Props {
  data: QuestionSectionViewModel<VideoLength>
}

export function VideoLengthQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q3" question="목표 영상 길이는 어느 정도인가요?" />
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option, i) => (
          <OptionButton
            key={option.value}
            letter={String.fromCharCode(97 + i)}
            label={option.label}
            selected={data.selected === option.value}
            onClick={() => data.onSelect(option.value)}
          />
        ))}
        <OptionButton
          letter={String.fromCharCode(97 + OPTIONS.length)}
          label="직접 입력"
          selected={data.selected === 'custom'}
          onClick={() => data.onSelect('custom')}
        />
      </div>
      {data.selected === 'custom' && (
        <CustomTextInput
          value={data.customValue}
          onChange={data.onCustomChange}
          placeholder="예: 1분 30초"
        />
      )}
    </div>
  )
}
