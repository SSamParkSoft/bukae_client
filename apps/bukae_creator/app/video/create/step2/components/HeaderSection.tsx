'use client'

import { memo } from 'react'

export const HeaderSection = memo(function HeaderSection() {
  return (
    <div className="mb-20 mt-[96px]">
      <div className="flex items-center justify-center mb-4">
        <span 
          className="font-bold bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
          style={{ 
            fontSize: 'var(--font-size-28)',
            lineHeight: 'var(--line-height-28-140)'
          }}
        >
          STEP 2
        </span>
      </div>
      <h1 
        className="text-center font-bold mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
        style={{ 
          fontSize: 'var(--font-size-32)',
          lineHeight: 'var(--line-height-32-140)'
        }}
      >
        어떻게 제작해볼까요?
      </h1>
      <p 
        className="text-center font-semibold text-brand-teal-dark tracking-[-0.36px]"
        style={{ 
          fontSize: 'var(--font-size-18)',
          lineHeight: 'var(--line-height-18-140)'
        }}
      >
        영상에 사용할 이미지를 선택한 뒤, 상단의 AI 스크립트 버튼을 눌러 전체 흐름에 맞는 장면 별 대본을 한 번에 생성하고 수정할 수 있어요.
      </p>
    </div>
  )
})
