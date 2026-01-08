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
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isActive = currentStep === step.number
        const isCompleted = currentStep > step.number
        const isPending = currentStep < step.number

        return (
          <div key={step.number} className="flex items-center gap-2">
            <button
              onClick={() => handleStepClick(step)}
              className="flex items-center gap-4 group"
            >
              {/* 스텝 번호/아이콘 */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full font-bold transition-all',
                    isActive
                      ? 'w-16 h-16 bg-[#5e8790] text-white text-[32px] leading-[44.8px]'
                      : isCompleted
                        ? 'w-12 h-12 bg-[#d2dedd] text-[#111111]'
                        : 'w-12 h-12 bg-[#e3e3e3] text-[#5d5d5d] text-2xl leading-[33.6px]'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-6 h-6 text-[#111111]" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                {/* 스텝 라벨 */}
                <span
                  className={cn(
                    'text-center font-bold whitespace-nowrap',
                    isActive
                      ? 'text-2xl leading-[33.6px] text-[#111111]'
                      : 'text-xl leading-7 text-[#111111]'
                  )}
                >
                  {step.label}
                </span>
              </div>
            </button>

            {/* 스텝 사이 연결선 */}
            {index < steps.length - 1 && (
              <div className="flex items-center mx-2">
                <div
                  className={cn(
                    'h-0.5 w-16',
                    isCompleted ? 'bg-[#234b60]' : 'bg-transparent'
                  )}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
