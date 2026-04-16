'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { STEPS, getCurrentStepIndex } from '../_utils/stepNavigation'

type StepState = 'completed' | 'active' | 'upcoming'

// 현재 pathname 기준으로 각 스텝의 상태(완료/활성/미도달)를 결정
function resolveStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completed'
  if (index === currentIndex) return 'active'
  return 'upcoming'
}

const circleBase =
  'flex items-center justify-center rounded-full shrink-0 w-7 h-7'

// 원형 — 완료 시 체크, 활성은 흰 배경+브랜드 숫자, 미도달은 얇은 보더
function StepCircle({ state, number }: { state: StepState; number: number }) {
  if (state === 'completed') {
    return (
      <div className={`${circleBase} bg-white`} aria-hidden="true">
        <Check size={14} className="text-brand" strokeWidth={2.5} />
      </div>
    )
  }
  if (state === 'active') {
    return (
      <div className={`${circleBase} bg-white`} aria-hidden="true">
        <span className="text-xs font-semibold leading-none text-brand">{number}</span>
      </div>
    )
  }
  return (
    <div
      className={`${circleBase} border border-white/25 bg-transparent`}
      aria-hidden="true"
    >
      <span className="text-xs font-semibold leading-none text-white/45">{number}</span>
    </div>
  )
}

// 라벨 — 활성만 굵게, 완료·미도달은 일반 굵기
function StepLabel({ state, children }: { state: StepState; children: string }) {
  if (state === 'upcoming') {
    return <span className="text-sm leading-none font-normal text-white/45">{children}</span>
  }
  if (state === 'active') {
    return <span className="text-sm leading-none font-bold text-white">{children}</span>
  }
  return <span className="text-sm leading-none font-normal text-white">{children}</span>
}

// 연결선 — 완료 구간은 밝게, 미완료 구간은 흐리게
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className="ml-[13px]"
      style={{
        width: 1.5,
        height: 24,
        backgroundColor: completed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
      }}
    />
  )
}

export function StepIndicator() {
  const pathname = usePathname()
  const currentIndex = getCurrentStepIndex(pathname)

  return (
    <ol className="flex flex-col">
      {STEPS.map((step, index) => {
        const state = resolveStepState(index, currentIndex)

        return (
          <li key={step.path} className="flex flex-col">
            {/* 원형 + 라벨 — 해당 스텝 페이지로 이동 */}
            <Link href={step.path} className="flex items-center gap-3">
              <StepCircle state={state} number={index + 1} />
              <StepLabel state={state}>{step.label}</StepLabel>
            </Link>

            {/* 스텝 사이 연결선 */}
            {index < STEPS.length - 1 && (
              <StepConnector completed={state === 'completed'} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
