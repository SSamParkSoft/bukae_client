'use client'

import { memo, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { ShoppingCart, ExternalLink } from 'lucide-react'
import type { Product } from '@/lib/types/domain/product'
import type { ProductResponse } from '@/lib/types/api/products'
import { calculateProductPriceInfo } from '../utils/productCalculations'

interface SelectedProductCardProps {
  product: Product
  productResponse?: ProductResponse
}

export const SelectedProductCard = memo(function SelectedProductCard({
  product,
  productResponse,
}: SelectedProductCardProps) {
  const priceInfo = useMemo(
    () => calculateProductPriceInfo(product, productResponse),
    [product, productResponse]
  )

  const handleOpenProduct = useCallback(() => {
    if (!product.url) return
    window.open(product.url, '_blank', 'noopener,noreferrer')
  }, [product.url])

  // 할인된 가격 또는 원래 가격 (할인된 가격이 있으면 그것을, 없으면 원래 가격)
  const displayPrice = priceInfo.salePrice || priceInfo.originalPrice || 0
  const displayCurrency = priceInfo.currency

  return (
    <div className="rounded-2xl">
      <div className="flex gap-4">
        <div className="flex-1 flex gap-4">
          <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#a6a6a6]">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name || '제품 이미지'}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 
              className="font-medium text-[#111111] mb-2 line-clamp-2 tracking-[-0.32px]"
              style={{ 
                fontSize: 'var(--font-size-16)',
                lineHeight: 'var(--line-height-16-140)'
              }}
            >
              {product.name || '제품명 없음'}
            </h3>
            {/* 가격 정보 - 할인된 가격과 상품 보기 버튼만 표시 */}
            <div className="flex items-center justify-between mb-2">
              <span 
                className="font-bold text-[#111111] tracking-[-0.48px]"
                style={{ 
                  fontSize: 'var(--font-size-24)',
                  lineHeight: 'var(--line-height-24-140)'
                }}
              >
                {displayPrice.toLocaleString()} {displayCurrency}
              </span>
              {product.url && (
                <button
                  type="button"
                  onClick={handleOpenProduct}
                  className="inline-flex items-center gap-1 font-bold tracking-[-0.32px] text-left hover:underline"
                  style={{ 
                    fontSize: 'var(--font-size-16)',
                    lineHeight: 'var(--line-height-16-140)',
                    color: '#234B60'
                  }}
                >
                  상품 보기
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* 예상 수익 카드 - 피그마 디자인대로 (하나의 카드에 예상 수익과 수수료율 포함, 내용 크기에 맞춰 오른쪽 배치) */}
            {priceInfo.expectedRevenue !== null && (
              <div className="flex justify-end mt-2">
                <div className="rounded-2xl bg-white border-2 border-[#5e8790] px-4 py-1 w-fit">
                  <div className="flex items-center gap-2 mb-0">
                    <span 
                      className="text-[12px] font-medium text-[#111111] whitespace-nowrap"
                      style={{ lineHeight: '16.8px' }}
                    >
                      예상 수익
                    </span>
                    <span 
                      className="font-bold text-[#111111] tracking-[-0.4px] whitespace-nowrap"
                      style={{ 
                        fontSize: '20px',
                        lineHeight: '28px'
                      }}
                    >
                      {Math.round(priceInfo.expectedRevenue).toLocaleString()} {priceInfo.currency}
                    </span>
                  </div>
                  {priceInfo.commissionRate && (
                    <div className="text-right -mt-1">
                      <span 
                        className="text-[12px] font-medium text-[#5d5d5d] whitespace-nowrap"
                        style={{ lineHeight: '16.8px' }}
                      >
                        수수료율 {priceInfo.commissionRate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
