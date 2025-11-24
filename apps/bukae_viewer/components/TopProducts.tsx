'use client'

import { useState } from 'react'
import { TopProduct } from '@/lib/types/viewer'
import { Loader2, ShoppingCart } from 'lucide-react'

interface TopProductsProps {
  topProducts: TopProduct[]
  isLoading?: boolean
  channelName?: string
}

export default function TopProducts({ topProducts, isLoading, channelName = '쌈박한 소프트' }: TopProductsProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 bg-white">
        <div className="flex justify-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {channelName} Top 5 추천 제품!
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-purple-300 animate-spin" />
        </div>
      </div>
    )
  }

  if (topProducts.length === 0) {
    return (
      <div className="px-4 py-6 bg-white">
        <div className="flex justify-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {channelName} Top 5 추천 제품!
          </h2>
        </div>
        <p className="text-gray-500 text-center py-8">추천 제품이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 bg-white">
      <div className="flex justify-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {channelName} Top 5 추천 제품!
        </h2>
      </div>
      <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex gap-4 justify-center min-w-max mx-auto">
          {topProducts.map((product) => {
            const ProductImage = () => {
              const [imageError, setImageError] = useState(false)

              if (!product.thumbnailUrl) {
                return (
                  <div className="w-full h-full bg-linear-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-purple-400" />
                  </div>
                )
              }

              if (imageError) {
                return (
                  <div className="w-full h-full bg-linear-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-purple-400" />
                  </div>
                )
              }

              return (
                <img
                  src={product.thumbnailUrl}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              )
            }

            const card = (
              <div className="shrink-0 w-40 bg-white rounded-lg border border-purple-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* 제품 이미지 */}
                <div className="w-full h-40 bg-purple-50 relative overflow-hidden">
                  <ProductImage />
                </div>

                {/* 제품 정보 */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-10">
                    {product.productName}
                  </h3>
                  <p className="text-base font-bold text-gray-900">
                    {formatPrice(product.averagePrice)}
                  </p>
                </div>
              </div>
            )

            if (product.productUrl) {
              return (
                <a
                  key={product.productId}
                  href={product.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg"
                >
                  {card}
                </a>
              )
            }

            return (
              <div key={product.productId}>
                {card}
              </div>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

