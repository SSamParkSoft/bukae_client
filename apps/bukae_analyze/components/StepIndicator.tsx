'use client'

import { usePathname } from 'next/navigation'

const STEPS = [
  { label: 'URL 입력', path: '/' },
  { label: 'AI 분석', path: '/analysis' },
  { label: '기획 설정', path: '/planning-setup' },
  { label: 'AI 기획', path: '/ai-planning' },
  { label: '촬영가이드 & 스크립트', path: '/shooting-guide' },
]

function getCurrentStepIndex(pathname: string): number {
  // 역순으로 매칭해 더 구체적인 경로 우선
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const step = STEPS[i]
    if (!step) continue
    if (step.path === '/' ? pathname === '/' : pathname.startsWith(step.path)) {
      return i
    }
  }
  return 0
}

export function StepIndicator() {
  const pathname = usePathname()
  const currentIndex = getCurrentStepIndex(pathname)

  return (
    <ol className="flex flex-col">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex
        const isActive = index === currentIndex
        const isUpcoming = index > currentIndex

        return (
          <li key={step.path} className="flex flex-col">
            <div className="flex items-center gap-3">
              {/* 원형 스텝 번호 */}
              <div
                className="flex items-center justify-center rounded-full shrink-0"
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: isCompleted || isActive ? '#000' : '#fff',
                  border: isUpcoming ? '1.5px solid #000' : 'none',
                }}
              >
                {isCompleted ? (
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                    <path
                      d="M1 5L5 9L13 1"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span
                    className="text-xs font-semibold leading-none"
                    style={{ color: isActive ? '#fff' : '#000' }}
                  >
                    {index + 1}
                  </span>
                )}
              </div>

              {/* 라벨 */}
              <span
                className="text-sm leading-none"
                style={{
                  fontWeight: isActive ? 700 : 400,
                  color: isUpcoming ? '#999' : '#000',
                }}
              >
                {step.label}
              </span>
            </div>

            {/* 스텝 사이 연결선 */}
            {index < STEPS.length - 1 && (
              <div
                className="ml-[13px]"
                style={{
                  width: 1.5,
                  height: 24,
                  backgroundColor: index < currentIndex ? '#000' : '#d4d4d4',
                }}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { STEPS }
