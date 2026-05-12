'use client'

import { Camera } from 'lucide-react'
import type { ShootingViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader } from './PlanningSetupPrimitives'
import { ShootingEnvironmentPanel } from './ShootingEnvironmentPanel'

interface Props {
  data: ShootingViewModel
}

export function ShootingQuestion({ data }: Props) {
  const isOn = data.selected === 'yes'

  const handleToggle = () => {
    data.onSelect(isOn ? null : 'yes')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader
          icon={Camera}
          title="촬영 방식"
          subtitle="직접 콘텐츠 촬영을 하실 예정인가요?"
        />
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-controls="shooting-environment-panel"
          onClick={handleToggle}
          className="relative flex h-8 w-12 shrink-0 items-center rounded-full border border-white/20 px-[3px] py-px transition-colors"
        >
          <span
            className={`size-6 rounded-full transition-all duration-200 ${
              isOn ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white/60'
            }`}
          />
        </button>
      </div>

      {isOn && (
        <ShootingEnvironmentPanel
          value={data.environment}
          onChange={data.onEnvironmentChange}
        />
      )}
    </div>
  )
}
