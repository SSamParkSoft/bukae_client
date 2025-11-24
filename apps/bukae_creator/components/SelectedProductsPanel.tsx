'use client'

import { useState } from 'react'
import { X, ArrowRight, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVideoCreateStore, Product } from '../store/useVideoCreateStore'
import { useThemeStore } from '../store/useThemeStore'

export default function SelectedProductsPanel() {
  const router = useRouter()
  const { selectedProducts, removeProduct, addProduct } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})

  const handleNext = () => {
    if (selectedProducts.length > 0) {
      router.push('/video/create/step2')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (data) {
      try {
        const product = JSON.parse(data) as Product
        // 이미 선택된 상품인지 확인
        const isAlreadySelected = selectedProducts.some((p) => p.id === product.id)
        if (isAlreadySelected) {
          removeProduct(product.id)
        } else {
          addProduct(product)
        }
      } catch (error) {
        console.error('Failed to parse product data:', error)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  return (
    <Card className="sticky top-8 w-72 xl:w-80 h-[calc(50vh-4rem)] flex flex-col border-gray-200">
      <CardHeader>
        <CardTitle>선택된 상품</CardTitle>
        <p className={`text-sm ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {selectedProducts.length}개 선택됨
        </p>
      </CardHeader>

      <CardContent
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20')
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/20')
        }}
        className={`flex-1 overflow-y-auto ${
          selectedProducts.length === 0
            ? `flex items-center justify-center border border-dashed rounded-lg ${
                theme === 'dark' 
                  ? 'border-gray-600' 
                  : 'border-gray-300'
              }`
            : ''
        }`}
      >
        {selectedProducts.length === 0 ? (
          <div className={`text-center ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <p className="text-sm mb-2">상품을 드래그하거나</p>
            <p className="text-sm">클릭하여 추가하세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <Card key={product.id} className="border-gray-200">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {product.image && !imageError[product.id] ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover"
                          onError={() =>
                            setImageError((prev) => ({
                              ...prev,
                              [product.id]: true,
                            }))
                          }
                        />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {product.name}
                      </h3>
                      <p className={`text-xs mb-1 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {product.price.toLocaleString()}원
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {product.platform === 'coupang' ? '쿠팡' :
                         product.platform === 'naver' ? '네이버' :
                         product.platform === 'aliexpress' ? '알리익스프레스' :
                         '아마존'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeProduct(product.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* 다음 단계 버튼 */}
      <div className="p-4">
        <Button
          onClick={handleNext}
          disabled={selectedProducts.length === 0}
          className="w-full gap-2"
        >
          <span>다음 단계</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </Card>
  )
}

