'use client'

import { useState } from 'react'
import { Product } from '@/lib/types/viewer'
import { Loader2, ShoppingCart } from 'lucide-react'

interface ProductGridProps {
  products: Product[]
  isLoading?: boolean
}

export default function ProductGrid({ products, isLoading }: ProductGridProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  if (isLoading) {
    return (
      <div className="px-4 py-6 bg-white">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="px-4 py-6 bg-white">
        <p className="text-gray-500 text-center py-12">제품이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 bg-purple-50/20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => {
          const cardContent = (
            <div className="bg-white rounded-lg border border-purple-100 overflow-hidden hover:shadow-md hover:border-purple-200 transition-all">
              {/* 제품 이미지 */}
              <div className="w-full aspect-square bg-purple-50 relative overflow-hidden">
                {(() => {
                  const ProductImage = () => {
                    const [imageError, setImageError] = useState(false)
                    const imageUrl = product.thumbnailUrl || product.image

                    if (!imageUrl) {
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
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    )
                  }

                  return <ProductImage />
                })()}
                {/* 순서 배지 */}
                <div className="absolute top-2 left-2 bg-purple-400 bg-opacity-80 text-white text-xs font-semibold px-2 py-1 rounded">
                  {product.order}
                </div>
              </div>

              {/* 제품 정보 */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-10">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                    {product.description}
                  </p>
                )}
                <p className="text-base font-bold text-gray-900">
                  {formatPrice(product.price)}
                </p>
              </div>
            </div>
          )

          if (product.url) {
            return (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-lg block"
              >
                {cardContent}
              </a>
            )
          }

          return (
            <div key={product.id} className="block">
              {cardContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}

