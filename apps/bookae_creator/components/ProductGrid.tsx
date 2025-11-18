'use client'

import { useState } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Product, Platform, useVideoCreateStore } from '../store/useVideoCreateStore'
import { useThemeStore } from '../store/useThemeStore'
import { SPAEL_PRODUCT } from '@/lib/data/spaelProduct'

// 더미 데이터
const dummyProducts: Record<Platform, Product[]> = {
  coupang: [
    SPAEL_PRODUCT,
    {
      id: 'c1',
      name: '무선 이어폰 블루투스 5.0',
      price: 29900,
      image: 'https://via.placeholder.com/200',
      platform: 'coupang',
      url: 'https://www.coupang.com/vp/products/c1',
      description: '고음질 무선 이어폰',
    },
    {
      id: 'c2',
      name: '스마트워치 피트니스 트래커',
      price: 49900,
      image: 'https://via.placeholder.com/200',
      platform: 'coupang',
      url: 'https://www.coupang.com/vp/products/c2',
      description: '건강 관리 스마트워치',
    },
    {
      id: 'c3',
      name: 'USB-C 충전 케이블',
      price: 8900,
      image: 'https://via.placeholder.com/200',
      platform: 'coupang',
      url: 'https://www.coupang.com/vp/products/c3',
      description: '고속 충전 케이블',
    },
  ],
  naver: [
    {
      id: 'n1',
      name: '에어컨 필터 세트',
      price: 15900,
      image: 'https://via.placeholder.com/200',
      platform: 'naver',
      url: 'https://shopping.naver.com/products/n1',
      description: '에어컨 청정 필터',
    },
    {
      id: 'n2',
      name: '무선 마우스',
      price: 19900,
      image: 'https://via.placeholder.com/200',
      platform: 'naver',
      url: 'https://shopping.naver.com/products/n2',
      description: '인체공학 무선 마우스',
    },
  ],
  aliexpress: [
    {
      id: 'a1',
      name: 'LED 스트립 라이트',
      price: 12900,
      image: 'https://via.placeholder.com/200',
      platform: 'aliexpress',
      url: 'https://www.aliexpress.com/item/a1',
      description: 'RGB LED 조명',
    },
  ],
  amazon: [
    {
      id: 'am1',
      name: 'Bluetooth Speaker',
      price: 39900,
      image: 'https://via.placeholder.com/200',
      platform: 'amazon',
      url: 'https://www.amazon.com/dp/am1',
      description: 'Portable wireless speaker',
    },
    {
      id: 'am2',
      name: 'Laptop Stand',
      price: 29900,
      image: 'https://via.placeholder.com/200',
      platform: 'amazon',
      url: 'https://www.amazon.com/dp/am2',
      description: 'Ergonomic laptop stand',
    },
  ],
}

const platformNames: Record<Platform, string> = {
  coupang: '쿠팡',
  naver: '네이버',
  aliexpress: '알리익스프레스',
  amazon: '아마존',
}

export default function ProductGrid() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all')
  const { addProduct, selectedProducts } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product))
  }

  const filteredProducts = () => {
    let products: Product[] = []
    
    if (selectedPlatform === 'all') {
      products = Object.values(dummyProducts).flat()
    } else {
      products = dummyProducts[selectedPlatform]
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    return products
  }

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
      {/* 검색 및 필터 */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="relative mb-4">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <Input
            type="text"
            placeholder="상품 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 플랫폼 탭 */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setSelectedPlatform('all')}
            variant={selectedPlatform === 'all' ? 'default' : 'outline'}
            size="sm"
          >
            전체
          </Button>
          {(Object.keys(platformNames) as Platform[]).map((platform) => (
            <Button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              variant={selectedPlatform === platform ? 'default' : 'outline'}
              size="sm"
            >
              {platformNames[platform]}
            </Button>
          ))}
        </div>
      </div>

      {/* 상품 그리드 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts().map((product) => {
            const isSelected = isProductSelected(product.id)
            return (
              <Card
                key={product.id}
                draggable
                onDragStart={(e) => handleDragStart(e, product)}
                onClick={() => !isSelected && addProduct(product)}
                className={`cursor-move transition-all ${
                  isSelected
                    ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                  <Badge variant="secondary" className="text-xs mb-1">
                    {platformNames[product.platform]}
                  </Badge>
                  <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {product.name}
                  </h3>
                  <p className={`text-xs mb-2 line-clamp-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {product.description}
                  </p>
                  <div className={`text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {product.price.toLocaleString()}원
                  </div>
                  {isSelected && (
                    <Badge variant="default" className="mt-2">
                      선택됨
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

