'use client'

import { memo } from 'react'
import type { ProductPriceInfo } from '../utils/productCalculations'

interface ProductPriceDisplayProps {
  priceInfo: ProductPriceInfo
  variant?: 'selected' | 'search'
}

export const ProductPriceDisplay = memo(function ProductPriceDisplay({
  priceInfo,
  variant = 'search',
}: ProductPriceDisplayProps) {
  const { originalPrice, salePrice, displayDiscount, currency } = priceInfo

  if (variant === 'selected') {
    // 선택된 상품 카드 스타일
    if (originalPrice && salePrice && originalPrice > salePrice) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[14px] font-medium text-[#a6a6a6] line-through tracking-[-0.14px] leading-[19.6px]">
            {originalPrice.toLocaleString()} {currency}
          </span>
          <span 
            className="font-bold text-[#111111] tracking-[-0.48px]"
            style={{ 
              fontSize: 'var(--font-size-24)',
              lineHeight: 'var(--line-height-24-140)'
            }}
          >
            {salePrice.toLocaleString()} {currency}
          </span>
          {displayDiscount && (
            <span className="px-2 py-1 rounded bg-[#dc2626] text-white text-[14px] font-bold tracking-[-0.14px] leading-[22.4px]">
              {displayDiscount} 할인
            </span>
          )}
        </div>
      )
    }
    return (
      <span 
        className="font-bold text-[#111111] tracking-[-0.48px]"
        style={{ 
          fontSize: 'var(--font-size-24)',
          lineHeight: 'var(--line-height-24-140)'
        }}
      >
        {salePrice ? `${salePrice.toLocaleString()} ${currency}` : '가격 정보 없음'}
      </span>
    )
  }

  // 검색된 상품 카드 스타일
  if (originalPrice && salePrice && originalPrice > salePrice) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-[#a6a6a6] line-through tracking-[-0.14px] leading-[19.6px]">
            {originalPrice.toLocaleString()} {currency}
          </span>
          {displayDiscount && (
            <span className="px-2 py-1 rounded bg-[#dc2626] text-white text-[14px] font-bold tracking-[-0.14px] leading-[22.4px]">
              {displayDiscount} 할인
            </span>
          )}
        </div>
        <span 
          className="font-bold text-[#111111] tracking-[-0.48px]"
          style={{ 
            fontSize: 'var(--font-size-24)',
            lineHeight: 'var(--line-height-24-140)'
          }}
        >
          {salePrice.toLocaleString()} {currency}
        </span>
      </div>
    )
  }

  return (
    <span 
      className="font-bold text-[#111111] tracking-[-0.48px]"
      style={{ 
        fontSize: 'var(--font-size-24)',
        lineHeight: 'var(--line-height-24-140)'
      }}
    >
      {salePrice ? `${salePrice.toLocaleString()} ${currency}` : '가격 정보 없음'}
    </span>
  )
})
