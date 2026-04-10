'use client'

import { usePathname } from 'next/navigation'
import { Check } from 'lucide-react'
import { STEPS, getCurrentStepIndex } from './_utils/stepNavigation'

type StepState = 'completed' | 'active' | 'upcoming'

// 현재 pathname 기준으로 각 스텝의 상태(완료/활성/미도달)를 결정
function resolveStepState(index: number, currentIndex: number): StepState {
  if (index < currentIndex) return 'completed'
  if (index === currentIndex) return 'active'
  return 'upcoming'
}

// 원형 — 완료 시 체크, 그 외 스텝 번호 표시
function StepCircle({ state, number }: { state: StepState; number: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        backgroundColor: state !== 'upcoming' ? '#000' : '#fff',
        border: state === 'upcoming' ? '1.5px solid #000' : 'none',
      }}
    >
      {state === 'completed' ? (
        <Check size={14} color="#fff" strokeWidth={2.5} />
      ) : (
        <span
          className="text-xs font-semibold leading-none"
          style={{ color: state === 'active' ? '#fff' : '#000' }}
        >
          {number}
        </span>
      )}
    </div>
  )
}

// 라벨 — 활성 스텝은 굵게, 미도달 스텝은 회색
function StepLabel({ state, children }: { state: StepState; children: string }) {
  return (
    <span
      className="text-sm leading-none"
      style={{
        fontWeight: state === 'active' ? 700 : 400,
        color: state === 'upcoming' ? '#999' : '#000',
      }}
    >
      {children}
    </span>
  )
}

// 연결선 — 완료 구간은 검정, 미완료 구간은 회색
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div
      className="ml-[13px]"
      style={{
        width: 1.5,
        height: 24,
        backgroundColor: completed ? '#000' : '#d4d4d4',
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
            {/* 원형 + 라벨 */}
            <div className="flex items-center gap-3">
              <StepCircle state={state} number={index + 1} />
              <StepLabel state={state}>{step.label}</StepLabel>
            </div>

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
