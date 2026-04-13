import type { FaceExposure } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { QuestionHeader, OptionButton, CustomTextInput } from './shared'

const OPTIONS: { value: FaceExposure; label: string }[] = [
  { value: 'face-cam', label: '얼굴 포함해서 직접 출연 (face-cam)' },
  { value: 'part-shot', label: '손/신체 일부만 등장 (파트 샷)' },
  { value: 'voice-over', label: '목소리만 (보이스오버)' },
  { value: 'no-face', label: '화면 녹화나 자료 위주 (no-face)' },
]

interface Props {
  data: QuestionSectionViewModel<FaceExposure>
}

export function FaceExposureQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q2" question="영상에 본인이 직접 등장하실 건가요?" />
      <div className="flex flex-col gap-2">
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
        />
      )}
    </div>
  )
}
