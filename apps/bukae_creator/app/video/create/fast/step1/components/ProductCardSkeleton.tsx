'use client'

import { memo } from 'react'

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl p-4 bg-white border-2 border-transparent shadow-(--shadow-card-default) animate-pulse">
      <div className="flex gap-4 items-end">
        <div className="flex-1 flex gap-4">
          {/* 이미지 스켈레톤 */}
          <div className="w-24 h-24 shrink-0 rounded-lg bg-gray-200" />
          
          {/* 텍스트 스켈레톤 */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* 제품명 스켈레톤 */}
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            
            {/* 가격 스켈레톤 */}
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            
            {/* 수수료율 스켈레톤 */}
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            
            {/* 링크 스켈레톤 */}
            <div className="h-4 bg-gray-200 rounded w-1/5" />
            
            {/* 예상 수익 스켈레톤 */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-col items-end gap-2">
                <div className="h-6 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
        
        {/* 버튼 스켈레톤 */}
        <div className="shrink-0">
          <div className="w-16 h-8 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
})
