'use client'

import { memo, useMemo } from 'react'
import Image from 'next/image'
import { ShoppingCart, ExternalLink } from 'lucide-react'
import type { Product } from '@/lib/types/domain/product'
import type { ProductResponse } from '@/lib/types/api/products'
import { calculateProductPriceInfo } from '../utils/productCalculations'
import { ProductPriceDisplay } from './ProductPriceDisplay'

interface ProductCardProps {
  product: Product
  productResponse?: ProductResponse
  isSelected: boolean
  onToggle: (product: Product) => void
}

export const ProductCard = memo(function ProductCard({
  product,
  productResponse,
  isSelected,
  onToggle,
}: ProductCardProps) {
  const priceInfo = useMemo(
    () => calculateProductPriceInfo(product, productResponse),
    [product, productResponse]
  )

  return (
    <div
      className={`rounded-2xl p-4 cursor-pointer shadow-[var(--shadow-card-default)] hover:shadow-lg transition-all ${
        isSelected
          ? 'bg-[#f0f7f8] border-2 border-[#5E8790]'
          : 'bg-white border-2 border-transparent'
      }`}
      onClick={() => onToggle(product)}
    >
      <div className="flex gap-4 items-end">
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
            <div className="mb-2">
              <ProductPriceDisplay priceInfo={priceInfo} variant="search" />
            </div>
            {priceInfo.commissionRate && (
              <p 
                className="font-bold mb-2 tracking-[-0.14px]"
                style={{ 
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-14-140)',
                  color: '#3b6574'
                }}
              >
                수수료율: {priceInfo.commissionRate}
              </p>
            )}
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 font-bold hover:underline tracking-[-0.32px] mb-2"
                style={{ 
                  fontSize: 'var(--font-size-16)',
                  lineHeight: 'var(--line-height-16-140)',
                  color: '#234B60'
                }}
              >
                상품 보기
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {priceInfo.expectedRevenue !== null && (
              <div className="mt-3 pt-3 border-t border-[#a6a6a6]">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#111111] leading-[16.8px]">예상 수익</span>
                    <span 
                      className="font-bold text-[#111111] tracking-[-0.48px]"
                      style={{ fontSize: 'var(--font-size-24)', lineHeight: 'var(--line-height-24-140)' }}
                    >
                      {Math.round(priceInfo.expectedRevenue).toLocaleString()} {priceInfo.currency}
                    </span>
                  </div>
                  <p className="text-[12px] font-medium text-[#5d5d5d] leading-[16.8px]">
                    * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-end">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle(product)
            }}
            className={`px-4 h-8 rounded-lg font-bold transition-colors ${
              isSelected
                ? 'bg-[#5E8790] text-white'
                : 'bg-[#e4eeed] text-[#111111] hover:bg-[#d4e0df]'
            }`}
            style={{ 
              fontSize: 'var(--font-size-12)',
              lineHeight: 'var(--line-height-12-140)'
            }}
          >
            {isSelected ? '선택됨' : '선택'}
          </button>
        </div>
      </div>
    </div>
  )
})
