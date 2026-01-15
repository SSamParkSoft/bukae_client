'use client'

import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface Step {
  number: number
  label: string
  path: string
}

interface StepNavigationProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (step: Step) => void
  className?: string
}

export default function StepNavigation({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepNavigationProps) {
  const router = useRouter()

  const handleStepClick = (step: Step) => {
    if (onStepClick) {
      onStepClick(step)
    } else {
      router.push(step.path)
    }
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.number
        const isCompleted = currentStep > step.number

        return (
          <div key={step.number} className="flex items-center">
            <button
              onClick={() => handleStepClick(step)}
              className="flex items-center gap-2 group"
            >
              {/* 원형 스텝 번호/아이콘 */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-full font-bold transition-all',
                  isActive
                    ? 'bg-[#5e8790] text-white w-8 h-8'
                    : isCompleted
                      ? 'bg-[#d2dedd] text-[#111111] w-8 h-8'
                      : 'bg-[#e3e3e3] text-[#5d5d5d] w-8 h-8'
                )}
                style={{
                  fontSize: 'var(--font-size-14)',
                  fontWeight: 'var(--font-weight-bold)',
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)'
                }}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-[#111111]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              {/* 스텝 라벨 (원형 옆) */}
              <span
                className="font-bold whitespace-nowrap"
                style={{
                  fontSize: 'var(--font-size-14)',
                  fontWeight: 'var(--font-weight-bold)'
                }}
              >
                {step.label}
              </span>
            </button>

            {/* 스텝 사이 연결선 (진행된 단계: " - ", 진행 남은 단계: " > ") */}
            {index < steps.length - 1 && (
              <div className="flex items-center" style={{ marginLeft: '32px', marginRight: '32px' }}>
                <span
                  className="text-[#111111]"
                  style={{
                    fontSize: 'var(--font-size-14)',
                    fontWeight: 'var(--font-weight-bold)'
                  }}
                >
                  {isCompleted ? ' - ' : ' > '}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
