'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LAYOUT } from './layout-constants'
import { StepIndicator, STEPS } from './StepIndicator'

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

export function LeftSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentIndex = getCurrentStepIndex(pathname)
  const isFirst = currentIndex === 0

  const handlePrev = () => {
    if (isFirst) return
    const prevStep = STEPS[currentIndex - 1]
    if (prevStep) router.push(prevStep.path)
  }

  return (
    <aside
      className="h-full relative border-r border-black/10 shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 스텝 인디케이터 */}
      <div style={{ marginTop: LAYOUT.STEP_INDICATOR_TOP, paddingLeft: 32, paddingRight: 16 }}>
        <StepIndicator />
      </div>

      {/* 이전 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <button
          type="button"
          onClick={handlePrev}
          className="px-6 py-2.5 text-sm font-medium border border-black rounded-md hover:bg-black hover:text-white transition-colors"
          style={{ opacity: isFirst ? 0 : 1, pointerEvents: isFirst ? 'none' : 'auto' }}
          tabIndex={isFirst ? -1 : 0}
        >
          이전
        </button>
      </div>
    </aside>
  )
}
