import type { VideoCategory } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { QuestionHeader, OptionButton, CustomTextInput } from './shared'

const OPTIONS: { value: VideoCategory; label: string }[] = [
  { value: 'product-promo', label: '상품 홍보형' },
  { value: 'information', label: '정보 전달형' },
  { value: 'review', label: '후기/리뷰형' },
  { value: 'vlog', label: '브이로그형' },
  { value: 'self-narrative', label: '자기서사형' },
  { value: 'challenge-meme', label: '챌린지/밈 활용형' },
  { value: 'interview-talk', label: '인터뷰/토크형' },
  { value: 'tutorial', label: '튜토리얼형' },
]

const LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

interface Props {
  data: QuestionSectionViewModel<VideoCategory>
}

export function CategoryQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q1" question="어떤 카테고리의 영상을 만들고 싶으신가요?" />
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option, i) => (
          <OptionButton
            key={option.value}
            letter={LETTERS[i]}
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
