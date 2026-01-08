'use client'

import { memo } from 'react'
import type { TargetMall } from '@/lib/types/api/products'

interface PlatformSelectorProps {
  selectedPlatform: TargetMall | 'all'
  onPlatformSelect: (platform: TargetMall | 'all') => void
}

export const PlatformSelector = memo(function PlatformSelector({
  selectedPlatform,
  onPlatformSelect,
}: PlatformSelectorProps) {
  return (
    <div className="mb-8 flex flex-col lg:flex-row items-start lg:items-center gap-4">
      <div 
        className="rounded-[20px] bg-white/20 border border-white/10 shadow-[var(--shadow-container)] p-6 w-full lg:w-[660px] lg:h-[130px]"
      >
        <div className="flex items-center gap-4 h-full">
          <button
            onClick={() => onPlatformSelect('all')}
            className={`flex-1 h-full rounded-lg text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[33.6px] shadow-[var(--shadow-card-default)] ${
              selectedPlatform === 'all'
                ? 'bg-brand-teal text-white'
                : 'bg-white text-brand-teal'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => onPlatformSelect('ALI_EXPRESS')}
            className={`flex-1 h-full rounded-lg text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[33.6px] shadow-[var(--shadow-card-default)] ${
              selectedPlatform === 'ALI_EXPRESS'
                ? 'bg-brand-teal text-white'
                : 'bg-white text-brand-teal'
            }`}
          >
            알리익스프레스
          </button>
          <button
            onClick={() => onPlatformSelect('COUPANG')}
            className={`flex-1 h-full rounded-lg text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[33.6px] shadow-[var(--shadow-card-default)] ${
              selectedPlatform === 'COUPANG'
                ? 'bg-brand-teal text-white'
                : 'bg-white text-brand-teal'
            }`}
          >
            쿠팡
          </button>
        </div>
      </div>
      <div className="text-[var(--font-size-16)] font-medium text-[#454545] leading-[28.8px] tracking-[-0.16px]">
        💡 복잡한 검색어 고민 NO! 평소 말하는 것처럼 자연스럽게 적어주세요.
        <br />
        💡 AI가 문맥을 파악해 지금 가장 잘 팔리는 &apos;인기 상품&apos;을 추천해 드릴게요.
        <br />
        💡 예) 화장실에서 심심할 때 좋은 거, 캠핑 가서 먹기 좋은 밀키트
      </div>
    </div>
  )
})
