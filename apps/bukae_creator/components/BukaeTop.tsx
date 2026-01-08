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
  { number: 2, label: '제작 방식', path: '/video/create/step2' },
  { number: 3, label: '이미지 및 대본', path: '/video/create/step3' },
  { number: 4, label: '미리보기 및 편집', path: '/video/create/step4' },
  { number: 5, label: '영상 생성', path: '/video/create/step5' },
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
  const showStepNavigation = detectedVariant === 'make'

  // currentStep이 제공되지 않으면 pathname 기반으로 자동 감지
  const getCurrentStep = (): number => {
    if (currentStep !== undefined) return currentStep

    if (pathname.includes('/step5')) return 5
    if (pathname.includes('/step4')) return 4
    if (pathname.includes('/step3')) return 3
    if (pathname.includes('/step2')) return 2
    if (pathname.includes('/step1')) return 1

    return 1
  }

  const activeTab: TopNavTab | undefined = detectedVariant === 'login' ? 'login' :
    detectedVariant === 'make' ? 'make' :
    detectedVariant === 'mypage' ? 'mypage' :
    detectedVariant === 'data' ? 'data' : undefined

  return (
    <div className={cn('w-full bg-white border-b border-[#d6d6d6]', className)}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-typography.svg"
              alt="부캐 로고"
              width={200}
              height={48}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Top Navigation */}
          <TopNavigation activeTab={activeTab} />
        </div>

        {/* Step Navigation (제작 페이지에서만 표시) */}
        {showStepNavigation && (
          <div className="flex justify-center">
            <StepNavigation
              steps={steps || defaultSteps}
              currentStep={getCurrentStep()}
              onStepClick={onStepClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
