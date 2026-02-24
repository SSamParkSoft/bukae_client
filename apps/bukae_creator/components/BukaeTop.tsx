'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { User } from 'lucide-react'
import TopNavigation, { TopNavTab } from './TopNavigation'
import StepNavigation, { Step } from './StepNavigation'
import ProfileDropdown from './ProfileDropdown'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'

interface BukaeTopProps {
  variant?: 'login' | 'make' | 'mypage' | 'data'
  steps?: Step[]
  currentStep?: number
  onStepClick?: (step: Step) => void
  className?: string
}

function getSteps(track: 'fast' | 'pro'): Step[] {
  return [
    { number: 1, label: '상품 선택', path: `/video/create/step1?track=${track}` },
    { number: 2, label: '대본 및 이미지', path: `/video/create/${track}/step2` },
    { number: 3, label: '미리보기 및 편집', path: `/video/create/${track}/step3` },
    { number: 4, label: '영상 생성', path: `/video/create/${track}/step4` },
  ]
}

function BukaeTopContent({
  variant,
  steps,
  currentStep,
  onStepClick,
  className,
}: BukaeTopProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useUserStore()

  // track: pathname이 fast/pro 포함 시 해당 값, step1일 때만 searchParams 사용 (기본 fast)
  const detectedTrack: 'fast' | 'pro' =
    pathname?.includes('/fast') ? 'fast'
    : pathname?.includes('/pro') ? 'pro'
    : searchParams?.get('track') === 'pro' ? 'pro'
    : 'fast'
  const defaultSteps = getSteps(detectedTrack)

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

  const activeTab: TopNavTab | undefined = detectedVariant === 'login' ? 'login' : undefined

  const handleMyPageClick = () => {
    router.push('/profile')
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="max-w-[1760px] mx-auto pt-4 pb-0" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
        <div className="flex items-center justify-between mb-6">
          {/* 로고 */}
          <Link href="/" className="shrink-0">
            <Image
              src="/bukae-logo.svg"
              alt="부캐 로고"
              width={189}
              height={34}
              priority
            />
          </Link>

          {/* 오른쪽 네비게이션 영역 */}
          <div className="flex items-center gap-0">
            {/* 로그인 상태일 때만 마이페이지 버튼과 프로필 드롭다운 표시 */}
            {isAuthenticated && user ? (
              <>
                {/* 마이페이지 버튼 (왼쪽) */}
                <button
                  onClick={handleMyPageClick}
                  className={cn(
                    'w-[140px] h-[52px] px-3 rounded-2xl text-sm font-bold transition-colors flex items-center gap-2 justify-center shrink-0',
                    detectedVariant === 'mypage'
                      ? 'bg-brand-teal text-white'
                      : 'bg-transparent text-[#454545] hover:bg-gray-100'
                  )}
                >
                  <User className="w-6 h-6 shrink-0" />
                  마이페이지
                </button>

                {/* 프로필 드롭다운 (오른쪽) */}
                <ProfileDropdown />
              </>
            ) : (
              /* 로그인하지 않은 상태: Top Navigation만 표시 */
              <TopNavigation activeTab={activeTab} />
            )}
          </div>
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
          <div className="max-w-[1760px] mx-auto pb-8 flex justify-start" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
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

export default function BukaeTop(props: BukaeTopProps) {
  return (
    <Suspense fallback={
      <div className={cn('w-full', props.className)}>
        <div className="max-w-[1760px] mx-auto pt-4 pb-0" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="shrink-0">
              <Image
                src="/bukae-logo.svg"
                alt="부캐 로고"
                width={189}
                height={34}
                priority
              />
            </Link>
          </div>
        </div>
      </div>
    }>
      <BukaeTopContent {...props} />
    </Suspense>
  )
}
