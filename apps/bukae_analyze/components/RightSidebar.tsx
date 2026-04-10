'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LAYOUT } from './layout-constants'
import { STEPS } from './StepIndicator'

function getCurrentStepIndex(pathname: string): number {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const step = STEPS[i]
    if (!step) continue
    if (step.path === '/' ? pathname === '/' : pathname.startsWith(step.path)) {
      return i
    }
  }
  return 0
}

export function RightSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1

  const handleNext = () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (nextStep) router.push(nextStep.path)
  }

  return (
    <aside
      className="h-full relative border-l border-black/10 shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 다음 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-black/80 transition-colors"
          style={{ opacity: isLast ? 0 : 1, pointerEvents: isLast ? 'none' : 'auto' }}
          tabIndex={isLast ? -1 : 0}
        >
          다음
        </button>
      </div>
    </aside>
  )
}
