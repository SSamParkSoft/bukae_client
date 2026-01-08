'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'

export interface ProductCardProps {
  imageUrl?: string
  title: string
  originalPrice?: number
  salePrice: number
  discountRate?: number
  commissionRate?: number
  expectedRevenue?: number
  productUrl?: string
  isSelected?: boolean
  onSelect?: () => void
  className?: string
}

export default function ProductCard({
  imageUrl,
  title,
  originalPrice,
  salePrice,
  discountRate,
  commissionRate,
  expectedRevenue,
  productUrl,
  isSelected = false,
  onSelect,
  className,
}: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <Card
      variant={isSelected ? 'selected' : 'default'}
      className={cn('p-4 relative', className)}
    >
      <div className="flex gap-4">
        {/* 상품 이미지 */}
        <div className="w-24 h-24 rounded-lg bg-[#a6a6a6] shrink-0 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-xs">
              이미지 없음
            </div>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          {/* 제목 */}
          <h3 className="text-base font-medium text-[#111111] leading-[22.4px] mb-2 line-clamp-2">
            {title}
          </h3>

          {/* 가격 정보 */}
          <div className="space-y-1 mb-2">
            {originalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#a6a6a6] line-through">
                  {formatPrice(originalPrice)}
                </span>
                {discountRate && (
                  <span className="px-2 py-1 rounded bg-[#dc2626] text-white text-sm font-bold">
                    {discountRate}% 할인
                  </span>
                )}
              </div>
            )}
            <div className="text-2xl font-bold text-[#111111] leading-[33.6px]">
              {formatPrice(salePrice)}
            </div>
            {commissionRate && (
              <div className="text-sm font-bold text-[#5e8790]">
                수수료율: {commissionRate.toFixed(1)}%
              </div>
            )}
          </div>

          {/* 상품 보기 링크 */}
          {productUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-base font-bold text-[#234b60] hover:underline"
            >
              상품 보기
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* 구분선 */}
      <div className="h-px bg-[#a6a6a6] my-4" />

      {/* 예상 수익 섹션 */}
      {expectedRevenue !== undefined && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#111111]">예상 수익</span>
            <span className="text-xl font-bold text-[#111111]">
              {formatPrice(expectedRevenue)}
            </span>
          </div>
          <p className="text-xs font-medium text-[#5d5d5d] text-right">
            * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
          </p>
        </div>
      )}

      {/* 선택 배지 */}
      <button
        onClick={onSelect}
        className={cn(
          'absolute top-4 right-4 px-4 py-2 rounded-lg text-xs font-bold transition-colors',
          isSelected
            ? 'bg-[#5e8790] text-white'
            : 'bg-[#e4eeed] text-[#111111] hover:bg-[#d2dedd]'
        )}
      >
        {isSelected ? '선택됨' : '선택'}
      </button>
    </Card>
  )
}
