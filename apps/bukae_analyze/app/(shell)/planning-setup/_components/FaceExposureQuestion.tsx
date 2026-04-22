import { UserCircle, Hand, Mic, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { FaceExposure } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader, IconButton, CustomTextInput } from './PlanningSetupPrimitives'

const OPTIONS: { value: FaceExposure; label: string; icon: LucideIcon }[] = [
  { value: 'face-cam', label: '얼굴 포함 직접 출연', icon: UserCircle },
  { value: 'part-shot', label: '손/신체 일부 출연', icon: Hand },
  { value: 'voice-over', label: '보이스만', icon: Mic },
]

interface Props {
  data: QuestionSectionViewModel<FaceExposure>
}

export function FaceExposureQuestion({ data }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={User}
        title="영상 노출 범위 설정"
        subtitle="영상에 노출 범위는 어느 정도 되시나요?"
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
          <IconButton
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
    </div>
  )
}
