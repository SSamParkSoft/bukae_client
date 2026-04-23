'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'

type StepState = 'completed' | 'active' | 'upcoming'

function resolveStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completed'
  if (index === currentIndex) return 'active'
  return 'upcoming'
}

function StepItem({
  step,
  number,
  state,
  projectId,
}: {
  step: { label: string; path: string }
  number: number
  state: StepState
  projectId: string | null
}) {
  const isActive = state === 'active'

  return (
    <Link
      href={buildStepPath(step.path, projectId)}
      className={[
        'flex items-center gap-4 w-full transition-colors',
        isActive
          ? 'bg-white/10 backdrop-blur-[2px] rounded-full'
          : '',
      ].join(' ')}
    >
      {/* 아이콘 */}
      <div
        className={[
          'size-8 shrink-0 flex items-center justify-center shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)]',
          isActive ? 'bg-white rounded-full' : 'rounded-[8px]',
        ].join(' ')}
      >
        <span
          style={{ fontSize: 'clamp(14px, 0.94vw, 16px)' }}
          className={[
            'font-medium tracking-[-0.04em] leading-[1.4]',
            isActive ? 'text-brand' : 'text-white',
          ].join(' ')}
        >
          {number}
        </span>
      </div>

      {/* 라벨 */}
      <span
        style={{ fontSize: 'clamp(14px, 0.83vw, 16px)' }}
        className={[
          'tracking-[-0.04em] leading-[1.4] whitespace-nowrap',
          isActive
            ? 'font-semibold text-white'
            : 'font-normal text-white/60',
        ].join(' ')}
      >
        {step.label}
      </span>
    </Link>
  )
}

export function StepIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const currentIndex = getCurrentStepIndex(pathname)

  return (
    <ol className="flex flex-col gap-6">
      {STEPS.map((step, index) => (
        <li key={step.path}>
          <StepItem
            step={step}
            number={index + 1}
            state={resolveStepState(index, currentIndex)}
            projectId={projectId}
          />
        </li>
      ))}
    </ol>
  )
}
