'use client'

import { useState, Suspense } from 'react'
import { X, ArrowRight, ShoppingCart } from 'lucide-react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVideoCreateStore } from '../store/useVideoCreateStore'
import type { Product } from '@/lib/types/domain/product'
import { useThemeStore } from '../store/useThemeStore'
import type { ProductResponse } from '@/lib/types/products'

interface SelectedProductsPanelProps {
  className?: string
  productResponses?: ProductResponse[]
  currentProducts?: Product[]
}

// useSearchParams를 사용하는 내부 컴포넌트 (Suspense로 감싸야 함)
function SelectedProductsPanelContent({ 
  className = '',
  productResponses = [],
  currentProducts = []
}: SelectedProductsPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const track = (searchParams?.get('track') === 'pro' ? 'pro' : 'fast') as 'fast' | 'pro'
  const { selectedProducts, removeProduct, addProduct } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [imageError, setImageError] = useState<Record<string, boolean>>({})
  const [showTooltip, setShowTooltip] = useState(false)

  const handleNext = () => {
    if (selectedProducts.length === 0) {
      return
    }

    // 쿠팡 상품이 있고 크롤링된 이미지가 없으면 말풍선 표시
    if (!hasCrawledImages()) {
      setShowTooltip(true)
      // 3초 후 자동으로 사라지게
      setTimeout(() => {
        setShowTooltip(false)
      }, 3000)
      return
    }

    // 이미지가 있으면 다음 단계로 이동 (track에 따라 fast/pro step2)
    router.push(`/video/create/${track}/step2`)
  }

  // 쿠팡 상품의 크롤링된 이미지가 있는지 확인
  const hasCrawledImages = () => {
    const coupangProducts = selectedProducts.filter(p => p.platform === 'coupang')
    if (coupangProducts.length === 0) {
      // 쿠팡 상품이 없으면 통과
      return true
    }
    
    // 쿠팡 상품이 있으면 모든 쿠팡 상품에 크롤링된 이미지가 있어야 함
    // 쿠팡의 경우 coupangcdn.com을 포함하는 실제 크롤링된 이미지가 있어야 함
    // 단순 썸네일만 있는 것은 크롤링된 이미지가 아님
    return coupangProducts.every(p => {
      if (!p.images || p.images.length === 0) {
        return false
      }
      
      // 쿠팡 크롤링된 이미지는 coupangcdn.com을 포함해야 함
      // 썸네일만 있는 경우는 크롤링된 이미지가 아님
      return p.images.some(img => 
        img && img.includes('coupangcdn.com')
      )
    })
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
    <Card className={`w-full max-h-[calc(100vh-8rem)] flex flex-col border-gray-200 ${className}`}>
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
            {selectedProducts.map((product) => {
              // 원본 데이터 찾기 (product.id로 매칭)
              const originalData = productResponses.find(
                (resp) => {
                  const respId = String(resp.productId || resp.id || '')
                  return respId === product.id
                }
              )
              
              // 원본 가격 정보
              const salePrice = originalData?.salePrice
              const originalPrice = originalData?.originalPrice
              const currency = originalData?.currency || 'KRW'
              
              // 표시할 가격 결정
              const displayPrice = salePrice || originalPrice || product.price
              const displayCurrency = (salePrice || originalPrice) ? currency : '원'

              return (
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
                        <div className="mb-1">
                          {originalPrice && salePrice && originalPrice > salePrice ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className={`text-xs line-through ${
                                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {originalPrice.toLocaleString()} {currency}
                              </span>
                              <span className={`text-xs font-semibold ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {salePrice.toLocaleString()} {currency}
                              </span>
                            </div>
                          ) : (
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {displayPrice.toLocaleString()} {displayCurrency}
                            </p>
                          )}
                        </div>
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
              )
            })}
          </div>
        )}
      </CardContent>

      {/* 다음 단계 버튼 */}
      <div className="p-4 relative">
        <Button
          onClick={handleNext}
          disabled={selectedProducts.length === 0}
          className="w-full gap-2"
        >
          <span>다음 단계</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
        
        {/* 말풍선 UI */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 z-50 mb-2"
              style={{ pointerEvents: 'none' }}
            >
              <div
                className={`px-4 py-3 rounded-lg shadow-lg relative ${
                  theme === 'dark'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                }`}
              >
                {/* 말풍선 꼬리 (아래쪽을 가리킴) */}
                <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 ${
                  theme === 'dark'
                    ? 'border-t-yellow-600'
                    : 'border-t-yellow-100'
                }`} />
                <p className="text-sm font-medium whitespace-nowrap relative z-10">
                  상품 이미지가 필요해요
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}

// Suspense로 감싼 메인 컴포넌트
export default function SelectedProductsPanel(props: SelectedProductsPanelProps) {
  return (
    <Suspense fallback={
      <Card className={`w-full max-h-[calc(100vh-8rem)] flex flex-col border-gray-200 ${props.className || ''}`}>
        <CardHeader>
          <CardTitle>선택된 상품</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <p className="text-sm text-gray-400">로딩 중...</p>
        </CardContent>
      </Card>
    }>
      <SelectedProductsPanelContent {...props} />
    </Suspense>
  )
}

