'use client'

import { useStepNavigation } from '../_hooks/useStepNavigation'
import { LAYOUT } from './layout-constants'
import { StepNavButton } from '../buttons/StepNavButton'

export function RightSidebar() {
  const { isHidden, isDisabled, handleNext } = useStepNavigation()

  if (isHidden) return null

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <StepNavButton
          direction="next"
          onClick={() => {
            void handleNext()
          }}
          disabled={isDisabled}
        />
      </div>
    </aside>
  )
}
