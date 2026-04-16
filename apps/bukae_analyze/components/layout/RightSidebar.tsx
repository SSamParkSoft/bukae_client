'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LAYOUT } from './layout-constants'
import { STEPS, getCurrentStepIndex } from '../_utils/stepNavigation'
import { SolidButton } from '../buttons/SolidButton'

export function RightSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/') return null

  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1

  const handleNext = () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (nextStep) router.push(nextStep.path)
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 다음 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <SolidButton onClick={handleNext} hidden={isLast}>다음</SolidButton>
      </div>
    </aside>
  )
}
