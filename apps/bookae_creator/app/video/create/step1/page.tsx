'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, ArrowRight, Search, ShoppingCart } from 'lucide-react'
import { useVideoCreateStore, Product, Platform } from '../../../../store/useVideoCreateStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import StepIndicator from '../../../../components/StepIndicator'
import SelectedProductsPanel from '../../../../components/SelectedProductsPanel'

// 인기 제품 더미 데이터
const popularProducts = [
  { id: 'pop1', name: '무선 이어폰', views: 12500, rank: 1 },
  { id: 'pop2', name: '스마트워치', views: 9800, rank: 2 },
  { id: 'pop3', name: '블루투스 스피커', views: 8700, rank: 3 },
  { id: 'pop4', name: '노트북 스탠드', views: 7200, rank: 4 },
  { id: 'pop5', name: '무선 마우스', views: 6500, rank: 5 },
]

// 더미 데이터
const dummyProducts: Record<Platform, Product[]> = {
  coupang: [
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
    {
      id: 'a2',
      name: '스마트폰 케이스',
      price: 5900,
      image: 'https://via.placeholder.com/200',
      platform: 'aliexpress',
      url: 'https://www.aliexpress.com/item/a2',
      description: '방수 보호 케이스',
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

export default function Step1Page() {
  const router = useRouter()
  const { selectedProducts, removeProduct, addProduct } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all')

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product))
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
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

  const handleNext = () => {
    if (selectedProducts.length > 0) {
      router.push('/video/create/step2')
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex">
        <StepIndicator />
        <div className="flex-1 p-8">
          <div className="max-w-5xl">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            상품 선택
          </h1>
          <p className={`mb-8 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            영상에 사용할 상품을 선택하세요
          </p>

          {/* 검색 및 필터 */}
          <div className={`mb-8 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="relative mb-4">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="상품 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* 플랫폼 탭 */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedPlatform('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlatform === 'all'
                    ? 'bg-purple-500 text-white'
                    : theme === 'dark'
                      ? 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {(Object.keys(platformNames) as Platform[]).map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlatform === platform
                      ? 'bg-purple-500 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {platformNames[platform]}
                </button>
              ))}
            </div>
          </div>

          {/* 인기 제품 순위 */}
          <div className={`mb-8 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className={`w-5 h-5 ${
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <h2 className={`text-xl font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                인기 제품 순위
              </h2>
            </div>
            <div className="space-y-3">
              {popularProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      product.rank <= 3
                        ? 'bg-purple-500 text-white'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {product.rank}
                    </div>
                    <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                      {product.name}
                    </span>
                  </div>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {product.views.toLocaleString()}회
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 그리드 */}
          <div className={`mb-8 rounded-lg shadow-sm border p-6 ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              상품 목록
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts().map((product) => {
                const isSelected = isProductSelected(product.id)
                return (
                  <div
                    key={product.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, product)}
                    onClick={() => !isSelected && addProduct(product)}
                    className={`p-4 rounded-lg border-2 cursor-move transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : theme === 'dark'
                          ? 'border-gray-700 bg-gray-900 hover:border-purple-600'
                          : 'border-gray-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className={`text-xs font-medium mb-1 ${
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {platformNames[product.platform]}
                    </div>
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
                      <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">
                        선택됨
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 다음 단계 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              disabled={selectedProducts.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedProducts.length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              <span>다음 단계</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        <SelectedProductsPanel />
      </div>
    </div>
  )
}

