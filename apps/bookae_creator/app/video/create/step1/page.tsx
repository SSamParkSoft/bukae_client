'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, ArrowRight, Search, ShoppingCart, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useVideoCreateStore, Product, Platform } from '../../../../store/useVideoCreateStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import StepIndicator from '../../../../components/StepIndicator'
import SelectedProductsPanel from '../../../../components/SelectedProductsPanel'
import { SPAEL_PRODUCT, isSpaelProduct } from '@/lib/data/spaelProduct'

// 인기 제품 더미 데이터
const popularProducts = [
  { id: 'pop1', name: '무선 이어폰', views: 12500, rank: 1 },
  { id: 'pop2', name: '스마트워치', views: 9800, rank: 2 },
  { id: 'pop3', name: '블루투스 스피커', views: 8700, rank: 3 },
  { id: 'pop4', name: '노트북 스탠드', views: 7200, rank: 4 },
  { id: 'pop5', name: '무선 마우스', views: 6500, rank: 5 },
]

// 더미 데이터 생성 함수
const generateProducts = (platform: Platform, count: number): Product[] => {
  const productTemplates: Record<Platform, { names: string[]; descriptions: string[]; priceRange: [number, number] }> = {
    coupang: {
      names: [
        '무선 이어폰 블루투스 5.0', '스마트워치 피트니스 트래커', 'USB-C 충전 케이블',
        '노트북 쿨링 패드', '무선 충전기', '블루투스 스피커', '스마트폰 거치대',
        'USB 허브', '케이블 정리함', '노트북 가방', '마우스 패드', '키보드',
        '웹캠', '마이크', '헤드셋', '모니터 스탠드', '책상 정리함', '의자 쿠션',
        'LED 데스크 램프', 'USB 메모리'
      ],
      descriptions: [
        '고음질 무선 이어폰', '건강 관리 스마트워치', '고속 충전 케이블',
        '노트북 발열 방지', '무선 충전 지원', '고품질 사운드', '각도 조절 가능',
        '다중 포트 지원', '케이블 정리 용이', '보호 기능 우수', '부드러운 마우스 움직임',
        '기계식 키보드', '고화질 영상', '선명한 음성', '편안한 착용감', '모니터 높이 조절',
        '책상 정리 도우미', '등받이 쿠션', '눈 피로 감소', '빠른 전송 속도'
      ],
      priceRange: [5000, 100000]
    },
    naver: {
      names: [
        '에어컨 필터 세트', '무선 마우스', '공기청정기 필터', '청소기 필터',
        '세탁기 세제', '다이어트 보조제', '비타민', '건강식품', '화장품 세트',
        '스킨케어', '선크림', '마스크팩', '샴푸', '바디워시', '핸드크림',
        '립밤', '에센스', '크림', '토너', '클렌징폼'
      ],
      descriptions: [
        '에어컨 청정 필터', '인체공학 무선 마우스', '미세먼지 제거', '먼지 제거 효율 우수',
        '강력한 세정력', '체중 관리', '영양 보충', '건강 유지', '완벽한 메이크업',
        '피부 관리', '자외선 차단', '수분 공급', '모발 관리', '부드러운 세정',
        '손 보호', '입술 보호', '피부 진정', '수분 공급', '피부 정화', '깨끗한 세정'
      ],
      priceRange: [5000, 50000]
    },
    aliexpress: {
      names: [
        'LED 스트립 라이트', '스마트폰 케이스', '보호 필름', '충전 케이블',
        '어댑터', '거치대', '카메라 렌즈', '셀카봉', '삼각대', '조명',
        '장식품', '액세서리', '가방', '지갑', '벨트', '시계',
        '반지', '목걸이', '귀걸이', '팔찌'
      ],
      descriptions: [
        'RGB LED 조명', '방수 보호 케이스', '스크래치 방지', '빠른 충전',
        '다양한 기기 지원', '안정적인 거치', '고화질 촬영', '자유로운 각도',
        '안정적인 촬영', '밝은 조명', '인테리어 소품', '스타일리시한 디자인',
        '실용적인 수납', '컴팩트한 디자인', '편안한 착용', '정확한 시간',
        '우아한 디자인', '세련된 스타일', '고급스러운 느낌', '데일리 착용'
      ],
      priceRange: [3000, 30000]
    },
    amazon: {
      names: [
        'Bluetooth Speaker', 'Laptop Stand', 'Wireless Mouse', 'Keyboard',
        'Monitor', 'Webcam', 'Microphone', 'Headphones', 'USB Hub', 'Cable',
        'Adapter', 'Charger', 'Power Bank', 'Tablet Stand', 'Phone Mount',
        'Desk Organizer', 'Cable Management', 'Laptop Sleeve', 'Backpack', 'Stand'
      ],
      descriptions: [
        'Portable wireless speaker', 'Ergonomic laptop stand', 'Precise tracking',
        'Mechanical keys', 'Crystal clear display', 'HD video quality', 'Studio quality',
        'Noise cancelling', 'Multiple ports', 'Fast charging', 'Universal compatibility',
        'Quick charge', 'High capacity', 'Adjustable angle', 'Secure mount',
        'Desk organization', 'Cable tidy', 'Laptop protection', 'Comfortable carry',
        'Stable support'
      ],
      priceRange: [10000, 200000]
    }
  }

  const template = productTemplates[platform]
  const products: Product[] = []

  for (let i = 1; i <= count; i++) {
    const nameIndex = (i - 1) % template.names.length
    const descIndex = (i - 1) % template.descriptions.length
    const price = Math.floor(
      Math.random() * (template.priceRange[1] - template.priceRange[0]) + template.priceRange[0]
    )
    
    products.push({
      id: `${platform}${i}`,
      name: `${template.names[nameIndex]} ${i > template.names.length ? `(${Math.floor(i / template.names.length) + 1})` : ''}`,
      price: Math.floor(price / 100) * 100, // 100원 단위로 반올림
      image: 'https://via.placeholder.com/200',
      platform,
      url: `https://${platform === 'coupang' ? 'www.coupang.com/vp/products' : platform === 'naver' ? 'shopping.naver.com/products' : platform === 'aliexpress' ? 'www.aliexpress.com/item' : 'www.amazon.com/dp'}/${platform}${i}`,
      description: template.descriptions[descIndex],
    })
  }

  return products
}

// 각 플랫폼별로 20개씩 생성
const dummyProducts: Record<Platform, Product[]> = {
  coupang: generateProducts('coupang', 20),
  naver: generateProducts('naver', 20),
  aliexpress: generateProducts('aliexpress', 20),
  amazon: generateProducts('amazon', 20),
}

// 쿠팡 첫 번째 항목을 스파알 제품으로 교체
dummyProducts.coupang[0] = SPAEL_PRODUCT

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
  const [displayCount, setDisplayCount] = useState(16) // 초기 표시 개수
  const [isLoading, setIsLoading] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, product: Product) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product))
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
  }

  // 플랫폼별로 골고루 섞기
  const shuffleProducts = (products: Product[]): Product[] => {
    const platformGroups: Record<Platform, Product[]> = {
      coupang: [],
      naver: [],
      aliexpress: [],
      amazon: [],
    }

    products.forEach((product) => {
      platformGroups[product.platform].push(product)
    })

    const shuffled: Product[] = []
    const maxLength = Math.max(...Object.values(platformGroups).map((arr) => arr.length))

    for (let i = 0; i < maxLength; i++) {
      Object.values(platformGroups).forEach((group) => {
        if (group[i]) {
          shuffled.push(group[i])
        }
      })
    }

    return shuffled
  }

  const filteredProducts = useMemo(() => {
    let products: Product[] = []
    
    if (selectedPlatform === 'all') {
      // 전체 선택 시 플랫폼별로 골고루 섞기
      products = shuffleProducts(Object.values(dummyProducts).flat())
    } else {
      products = dummyProducts[selectedPlatform]
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    // 스파알 제품을 맨 앞으로 이동
    const spaelIndex = products.findIndex((p) => isSpaelProduct(p))
    if (spaelIndex > 0) {
      const spaelProduct = products[spaelIndex]
      products.splice(spaelIndex, 1)
      products.unshift(spaelProduct)
    }

    return products
  }, [selectedPlatform, searchQuery])

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, displayCount)
  }, [filteredProducts, displayCount])

  // 무한 스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && displayCount < filteredProducts.length) {
          setIsLoading(true)
          // 로딩 시뮬레이션
          setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + 16, filteredProducts.length))
            setIsLoading(false)
          }, 300)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [displayCount, filteredProducts.length, isLoading])

  // 검색어나 플랫폼 변경 시 displayCount 리셋
  useEffect(() => {
    setDisplayCount(16)
  }, [searchQuery, selectedPlatform])

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  const handleNext = () => {
    if (selectedProducts.length > 0) {
      router.push('/video/create/script-method')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px]">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 overflow-y-auto min-w-0">
          <div className="max-w-full">
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
              상품 목록 ({filteredProducts.length}개)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedProducts.map((product) => {
                const isSelected = isProductSelected(product.id)
                return (
                  <div
                    key={product.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, product)}
                    onClick={() => {
                      if (isSelected) {
                        removeProduct(product.id)
                      } else {
                        addProduct(product)
                      }
                    }}
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
            {/* 무한 스크롤 트리거 */}
            {displayCount < filteredProducts.length && (
              <div ref={observerTarget} className="flex justify-center py-8">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                ) : (
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    더 많은 상품 로딩 중...
                  </div>
                )}
              </div>
            )}
            {displayCount >= filteredProducts.length && filteredProducts.length > 0 && (
              <div className={`text-center py-4 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                모든 상품을 불러왔습니다
              </div>
            )}
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
      <div className="hidden lg:block p-4 md:p-8 flex-shrink-0">
        <SelectedProductsPanel />
      </div>
    </motion.div>
  )
}

