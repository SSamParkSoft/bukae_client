'use client'

import { memo, useMemo } from 'react'
import Image from 'next/image'
import { ShoppingCart, X } from 'lucide-react'
import type { Product } from '@/lib/types/domain/product'
import type { ProductResponse } from '@/lib/types/api/products'
import { calculateProductPriceInfo, getPlatformName } from '../utils/productCalculations'
import { ProductPriceDisplay } from './ProductPriceDisplay'
import { ExpectedRevenue } from './ExpectedRevenue'

interface SelectedProductCardProps {
  product: Product
  productResponse?: ProductResponse
  onRemove: (product: Product) => void
}

export const SelectedProductCard = memo(function SelectedProductCard({
  product,
  productResponse,
  onRemove,
}: SelectedProductCardProps) {
  const priceInfo = useMemo(
    () => calculateProductPriceInfo(product, productResponse),
    [product, productResponse]
  )
  
  const platformName = useMemo(() => getPlatformName(product.platform), [product.platform])

  return (
    <div className="relative flex gap-4 mb-4 last:mb-0">
      <button
        type="button"
        onClick={() => onRemove(product)}
        className="absolute right-0 top-0 p-2 text-[#5d5d5d] hover:text-[#111111] transition-colors"
        aria-label="선택된 상품 삭제"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="w-[148px] h-[148px] shrink-0 rounded-lg overflow-hidden bg-[#a6a6a6]">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name || '제품 이미지'}
            width={148}
            height={148}
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 
          className="font-semibold text-[#111111] mb-2 line-clamp-2 tracking-[-0.36px]"
          style={{ 
            fontSize: 'var(--font-size-18)',
            lineHeight: 'var(--line-height-18-140)'
          }}
        >
          {product.name || '제품명 없음'}
        </h3>
        <div className="mb-4">
          <ProductPriceDisplay priceInfo={priceInfo} variant="selected" />
        </div>
        <div className="mb-2">
          <span className="inline-block px-3 py-1.5 rounded-lg bg-[#a6a6a6] text-white text-[12px] font-bold leading-[16.8px]">
            {platformName}
          </span>
        </div>
        {priceInfo.commissionRate && (
          <p 
            className="font-bold mb-2 tracking-[-0.14px]"
            style={{ 
              fontSize: 'var(--font-size-14)',
              lineHeight: 'var(--line-height-14-140)',
              color: 'var(--brand-teal-dark)'
            }}
          >
            수수료율: {priceInfo.commissionRate}
          </p>
        )}
        <ExpectedRevenue priceInfo={priceInfo} variant="selected" />
      </div>
    </div>
  )
})
