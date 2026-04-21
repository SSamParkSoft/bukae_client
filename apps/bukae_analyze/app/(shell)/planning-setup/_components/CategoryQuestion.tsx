import {
  Volume2,
  Info,
  Star,
  Video,
  Navigation,
  Smile,
  MessageCircle,
  GraduationCap,
  Play,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { VideoCategory } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader, IconButton } from './PlanningSetupPrimitives'

const OPTIONS: { value: VideoCategory; label: string; icon: LucideIcon }[] = [
  { value: 'product-promo', label: '상품 홍보형', icon: Volume2 },
  { value: 'information', label: '정보 전달형', icon: Info },
  { value: 'review', label: '후기/리뷰형', icon: Star },
  { value: 'vlog', label: '브이로그형', icon: Video },
  { value: 'self-narrative', label: '자기서사형', icon: Navigation },
  { value: 'challenge-meme', label: '챌린지/밈 활용형', icon: Smile },
  { value: 'interview-talk', label: '인터뷰/토크형', icon: MessageCircle },
  { value: 'tutorial', label: '튜토리얼형', icon: GraduationCap },
]

interface Props {
  data: QuestionSectionViewModel<VideoCategory>
}

export function CategoryQuestion({ data }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Play}
        title="카테고리 설정"
        subtitle="어떤 카테고리의 영상을 만들고 싶으신가요?"
      />
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          {OPTIONS.map(option => (
            <IconButton
              key={option.value}
              icon={option.icon}
              label={option.label}
              selected={data.selected === option.value}
              onClick={() => data.onSelect(option.value)}
            />
          ))}
        </div>
        <input
          type="text"
          value={data.selected === 'custom' ? data.customValue : ''}
          onChange={e => {
            data.onSelect('custom')
            data.onCustomChange(e.target.value)
          }}
          placeholder="직접 입력"
          aria-label="카테고리 직접 입력"
          className={`w-full px-6 py-[17px] rounded-lg backdrop-blur-[2px] font-16-md text-right transition-colors focus:outline-none 
            ${data.selected === 'custom'
              ? 'bg-white/40 text-white placeholder:text-white/50'
              : 'bg-white/10 text-white/60 placeholder:text-white/35 hover:bg-white/20 hover:text-white'
          }`}
        />
      </div>
    </div>
  )
}
