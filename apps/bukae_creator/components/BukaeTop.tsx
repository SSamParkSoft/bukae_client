'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TopNavigation, { TopNavTab } from './TopNavigation'
import StepNavigation, { Step } from './StepNavigation'
import { cn } from '@/lib/utils'

interface BukaeTopProps {
  variant?: 'login' | 'make' | 'mypage' | 'data'
  steps?: Step[]
  currentStep?: number
  onStepClick?: (step: Step) => void
  className?: string
}

const defaultSteps: Step[] = [
  { number: 1, label: '상품 선택', path: '/video/create/step1' },
  { number: 2, label: '대본 및 이미지', path: '/video/create/step2' },
  { number: 3, label: '미리보기 및 편집', path: '/video/create/step3' },
  { number: 4, label: '영상 생성', path: '/video/create/step4' },
]

export default function BukaeTop({
  variant,
  steps,
  currentStep,
  onStepClick,
  className,
}: BukaeTopProps) {
  const pathname = usePathname()

  // variant가 제공되지 않으면 pathname 기반으로 자동 감지
  const getVariant = (): 'login' | 'make' | 'mypage' | 'data' => {
    if (variant) return variant

    if (pathname.includes('/login')) return 'login'
    if (pathname.includes('/video/create') || pathname.includes('/video/create/')) return 'make'
    if (pathname.includes('/profile')) return 'mypage'
    if (pathname.includes('/statistics')) return 'data'

    return 'make' // 기본값
  }

  const detectedVariant = getVariant()

  // currentStep이 제공되지 않으면 pathname 기반으로 자동 감지
  const getCurrentStep = (): number => {
    if (currentStep !== undefined) return currentStep

    if (pathname.includes('/step4')) return 4
    if (pathname.includes('/step3')) return 3
    if (pathname.includes('/step2')) return 2
    if (pathname.includes('/step1')) return 1

    return 0 // 0단계 페이지
  }

  const detectedCurrentStep = getCurrentStep()
  // Step Navigation은 제작 페이지에서만 표시하되, 0단계에서는 숨김
  const showStepNavigation = detectedVariant === 'make' && detectedCurrentStep > 0

  const activeTab: TopNavTab | undefined = detectedVariant === 'login' ? 'login' :
    detectedVariant === 'make' ? 'make' :
    detectedVariant === 'mypage' ? 'mypage' :
    detectedVariant === 'data' ? 'data' : undefined

  return (
    <div className={cn('w-full', className)}>
      <div className="max-w-[1194px] mx-auto px-6 pt-4 pb-0">
        <div className="flex items-center justify-between mb-6">
          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <Image
              src="/bukae-logo.svg"
              alt="부캐 로고"
              width={189}
              height={34}
              className="h-[34px] w-auto"
              priority
            />
          </Link>

          {/* Top Navigation */}
          <TopNavigation activeTab={activeTab} />
        </div>
      </div>

      {/* Step Navigation 영역 (제작 페이지에서만 표시, 0단계 제외) */}
      {showStepNavigation && (
        <div 
          className="w-full relative"
          style={{
            ...(detectedCurrentStep !== 3 && {
              boxShadow: '0px 4px 16px 0px rgba(94, 135, 144, 0.2)',
              clipPath: 'inset(0 0 -20px 0)'
            })
          }}
        >
          <div className="max-w-[1194px] mx-auto pb-4 flex justify-end" style={{ paddingLeft: 'calc(1.5rem + 12px)', paddingRight: 'calc(1.5rem + 24px)' }}>
            <StepNavigation
              steps={steps || defaultSteps}
              currentStep={detectedCurrentStep}
              onStepClick={onStepClick}
            />
          </div>
        </div>
      )}
    </div>
  )
}
