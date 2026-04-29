'use client'

import Link from 'next/link'
import {
  ANALYZE_WORKFLOW_STEPS,
  buildAnalyzeWorkflowStepPath,
} from '@/components/workflow/lib/analyzeWorkflowSteps'
import { useAnalyzeWorkflowRouteState } from '@/components/workflow/hooks/useAnalyzeWorkflowRouteState'

type StepState = 'completed' | 'active' | 'upcoming'

function resolveStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completed'
  if (index === currentIndex) return 'active'
  return 'upcoming'
}

function AnalyzeWorkflowStepLink({
  step,
  number,
  state,
  projectId,
  planning,
  generationRequestId,
}: {
  step: { label: string; path: string }
  number: number
  state: StepState
  projectId: string | null
  planning: string | null
  generationRequestId: string | null
}) {
  const isActive = state === 'active'

  return (
    <Link
      href={buildAnalyzeWorkflowStepPath(step.path, { projectId, planning, generationRequestId })}
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

export function AnalyzeWorkflowStepList() {
  const {
    projectId,
    planning,
    generationRequestId,
    currentStepIndex,
  } = useAnalyzeWorkflowRouteState()

  return (
    <ol className="flex flex-col gap-6">
      {ANALYZE_WORKFLOW_STEPS.map((step, index) => (
        <li key={step.path}>
          <AnalyzeWorkflowStepLink
            step={step}
            number={index + 1}
            state={resolveStepState(index, currentStepIndex)}
            projectId={projectId}
            planning={planning}
            generationRequestId={generationRequestId}
          />
        </li>
      ))}
    </ol>
  )
}
