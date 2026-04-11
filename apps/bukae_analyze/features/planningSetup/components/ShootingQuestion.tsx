import type { ShootingViewModel } from '../types/viewModel'
import { QuestionHeader, CustomTextInput } from './shared'

interface ShootingOptionProps {
  label: string
  selected: boolean
  onClick: () => void
}

function ShootingOption({ label, selected, onClick }: ShootingOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 rounded-lg border text-sm font-semibold transition-colors ${
        selected
          ? 'bg-black text-white border-black'
          : 'bg-white text-black border-black/15 hover:border-black/40'
      }`}
    >
      {label}
    </button>
  )
}

interface Props {
  data: ShootingViewModel
}

export function ShootingQuestion({ data }: Props) {
  return (
    <div>
      <QuestionHeader number="Q4" question="직접 촬영할 예정인가요?" />
      <div className="flex gap-3">
        <ShootingOption
          label="O"
          selected={data.selected === 'yes'}
          onClick={() => data.onSelect('yes')}
        />
        <ShootingOption
          label="X"
          selected={data.selected === 'no'}
          onClick={() => data.onSelect('no')}
        />
      </div>
      {data.selected === 'yes' && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-black mb-3">어느 환경에서 촬영할 생각인가요?</p>
          <CustomTextInput
            value={data.environment}
            onChange={data.onEnvironmentChange}
            placeholder="예: 실내 자연광, 야외, 스튜디오 등"
          />
        </div>
      )}
    </div>
  )
}
