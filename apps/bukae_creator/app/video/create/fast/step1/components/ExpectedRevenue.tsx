'use client'

import { memo } from 'react'
import type { ProductPriceInfo } from '../utils/productCalculations'

interface ExpectedRevenueProps {
  priceInfo: ProductPriceInfo
  variant?: 'selected' | 'search'
}

export const ExpectedRevenue = memo(function ExpectedRevenue({
  priceInfo,
  variant = 'search',
}: ExpectedRevenueProps) {
  const { expectedRevenue, currency } = priceInfo

  if (expectedRevenue === null) return null

  if (variant === 'selected') {
    return (
      <div className="mt-3 pt-3 border-t border-[#a6a6a6]">
        <div className="flex items-end justify-end gap-2">
          <span className="text-[12px] font-medium text-[#111111] leading-[16.8px]">예상 수익</span>
          <span 
            className="font-bold text-[#111111] tracking-[-0.48px]"
            style={{ fontSize: 'var(--font-size-24)', lineHeight: 'var(--line-height-24-140)' }}
          >
            {Math.round(expectedRevenue).toLocaleString()} {currency}
          </span>
        </div>
        <p className="text-[12px] font-medium text-[#5d5d5d] text-right mt-1 leading-[16.8px]">
          * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-[#a6a6a6]">
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-[#111111] leading-[16.8px]">예상 수익</span>
          <span 
            className="font-bold text-[#111111] tracking-[-0.48px]"
            style={{ fontSize: 'var(--font-size-24)', lineHeight: 'var(--line-height-24-140)' }}
          >
            {Math.round(expectedRevenue).toLocaleString()} {currency}
          </span>
        </div>
        <p className="text-[12px] font-medium text-[#5d5d5d] leading-[16.8px]">
          * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
        </p>
      </div>
    </div>
  )
})
