'use client'

import { Check } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
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
  const pathname = usePathname()
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
        const isPending = currentStep < step.number

        return (
          <div key={step.number} className="flex items-center">
            <button
              onClick={() => handleStepClick(step)}
              className="flex items-center gap-10 group"
            >
              {/* 원형 스텝 번호/아이콘 */}
              <div
                className={cn(
                  'flex items-center justify-center rounded-full font-bold transition-all w-12 h-12',
                  isActive
                    ? 'bg-[#5e8790] text-white'
                    : isCompleted
                      ? 'bg-[#d2dedd] text-[#111111]'
                      : 'bg-[#e3e3e3] text-[#5d5d5d]'
                )}
                style={{
                  fontSize: 'var(--font-size-20)',
                  fontWeight: 'var(--font-weight-bold)',
                  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)'
                }}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6 text-[#111111]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              {/* 스텝 라벨 (원형 옆) */}
              <span
                className="font-bold whitespace-nowrap"
                style={{
                  fontSize: 'var(--font-size-20)',
                  fontWeight: 'var(--font-weight-bold)'
                }}
              >
                {step.label}
              </span>
            </button>

            {/* 스텝 사이 연결선 (진행된 단계: " - ", 진행 남은 단계: " > ") */}
            {index < steps.length - 1 && (
              <div className="flex items-center mx-10">
                <span
                  className="text-[#111111]"
                  style={{
                    fontSize: 'var(--font-size-20)',
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
