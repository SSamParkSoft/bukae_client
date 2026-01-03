'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle, Send, ShoppingCart, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useVideoCreateStore } from '../../../../store/useVideoCreateStore'
import type { Product } from '@/lib/types/domain/product'
import { useThemeStore } from '../../../../store/useThemeStore'
import { useUserStore } from '../../../../store/useUserStore'
import StepIndicator from '../../../../components/StepIndicator'
import SelectedProductsPanel from '../../../../components/SelectedProductsPanel'
import { searchProducts } from '@/lib/api/products'
import type { TargetMall, ProductResponse } from '@/lib/types/products'
import { convertProductResponseToProduct } from '@/lib/types/products'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'

type ThemeMode = 'light' | 'dark'

// 플랫폼 정보
const platformInfo: Record<TargetMall, { name: string; enabled: boolean }> = {
  ALI_EXPRESS: { name: '알리익스프레스', enabled: true },
  COUPANG: { name: '쿠팡', enabled: true },
  AMAZON: { name: '아마존', enabled: false },
}

// 챗봇 메시지 타입
interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'error'
  content: string
  products?: Product[]
  timestamp: Date
}

export default function Step1Page() {
  const router = useRouter()
  const { removeProduct, addProduct, selectedProducts, clearProducts } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const { getPlatformTrackingId } = useUserStore()

  // 상태 관리
  const [selectedPlatform, setSelectedPlatform] = useState<TargetMall | 'all'>('all')
  const [prompt, setPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [currentProducts, setCurrentProducts] = useState<Product[]>([])
  const [currentProductResponses, setCurrentProductResponses] = useState<ProductResponse[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // 플랫폼 선택 핸들러
  const handlePlatformSelect = (platform: TargetMall | 'all') => {
    setSelectedPlatform(platform)
    setSearchError(null)
  }

  // 상품 선택/해제
  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  const handleProductToggle = (product: Product) => {
    if (isProductSelected(product.id)) {
      // 이미 선택된 상품이면 선택 해제
      removeProduct(product.id)
    } else {
      // 새로운 상품 선택 시 기존 선택 모두 제거 후 새 상품만 선택
      clearProducts()
      addProduct(product)
    }
  }

  // 검색 실행
  const handleSearch = useCallback(async () => {
    if (!prompt.trim()) {
      setSearchError('검색어를 입력해주세요.')
      return
    }

    // 플랫폼 선택 확인
    if (selectedPlatform === 'all') {
      setSearchError('플랫폼을 선택해주세요.')
      return
    }

    setIsSearching(true)
    setSearchError(null)

    // 사용자 메시지 추가
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    }
    setChatMessages((prev) => [...prev, userMessage])

    try {
      // 플랫폼별 tracking ID 가져오기
      const trackingId = getPlatformTrackingId(selectedPlatform)

      if (!trackingId) {
        setSearchError(
          `${platformInfo[selectedPlatform].name}의 추적 ID가 설정되지 않았습니다. 프로필에서 설정해주세요.`
        )
        setIsSearching(false)
        return
      }

      // API 호출 (동기 응답)
      const products: ProductResponse[] = await searchProducts({
        query: prompt,
        targetMall: selectedPlatform,
        userTrackingId: trackingId,
      })

      // 상품 목록 수신
      const convertedProducts = products.map((p) => {
        return convertProductResponseToProduct(p, selectedPlatform)
      })
      setCurrentProducts(convertedProducts)
      setCurrentProductResponses(products) // 원본 데이터도 저장

      // AI 응답 메시지 추가
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: `${products.length}개의 상품을 찾았습니다.`,
        products: convertedProducts,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, assistantMessage])
      setIsSearching(false)
    } catch (error) {
      console.error('[ProductSearch] 검색 실패:', error)
      const errorMessage =
        error instanceof Error ? error.message : '상품 검색 중 오류가 발생했습니다.'
      setSearchError(errorMessage)

      const errorChatMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: errorMessage,
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, errorChatMessage])
      setIsSearching(false)
    }
  }, [prompt, selectedPlatform, getPlatformTrackingId])

  // Enter 키로 검색
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSearching) {
      e.preventDefault()
      handleSearch()
    }
  }

  const themeMode: ThemeMode = theme

  // 토큰 검증 중에는 로딩 표시
  if (isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-screen justify-center"
    >
      <div className="flex w-full max-w-[1600px] relative">
        <StepIndicator />
        <div className="flex-1 p-4 md:p-8 min-w-0 overflow-y-auto" style={{ maxHeight: '100vh' }}>
          <div className="max-w-full">
            <h1
              className={`text-3xl font-bold mb-2 ${
                themeMode === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              상품 선택
            </h1>
            <p
              className={`mb-8 ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              AI에게 원하는 상품을 물어보세요
            </p>

            {/* 플랫폼 선택 카드 */}
            <div
              className={`mb-6 rounded-lg shadow-sm border p-6 ${
                themeMode === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2
                className={`text-lg font-semibold mb-4 ${
                  themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                플랫폼 선택
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => handlePlatformSelect('all')}
                  disabled
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPlatform === 'all'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : themeMode === 'dark'
                        ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`font-medium ${
                      themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    전체
                  </div>
                  <div className="text-xs text-gray-400 mt-1">준비 중</div>
                </button>
                {(Object.keys(platformInfo) as TargetMall[]).map((platform) => {
                  const info = platformInfo[platform]
                  return (
                    <button
                      key={platform}
                      onClick={() => handlePlatformSelect(platform)}
                      disabled={!info.enabled}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPlatform === platform
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : info.enabled
                            ? themeMode === 'dark'
                              ? 'border-gray-700 bg-gray-900 hover:border-purple-600'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                            : themeMode === 'dark'
                              ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className={`font-medium ${
                          selectedPlatform === platform
                            ? 'text-purple-600 dark:text-purple-400'
                            : themeMode === 'dark'
                              ? 'text-gray-300'
                              : 'text-gray-700'
                        }`}
                      >
                        {info.name}
                      </div>
                      {!info.enabled && (
                        <div className="text-xs text-gray-400 mt-1">준비 중</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 프롬프트 입력 섹션 */}
            <div
              className={`mb-6 rounded-lg shadow-sm border p-6 ${
                themeMode === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="예) 화장실에서 심심할 때 좋은 거, 캠핑 가서 먹기 좋은 밀키트, 여친한테 사랑받는 선물"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isSearching || selectedPlatform === 'all'}
                  className={`w-full pl-4 pr-12 py-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg ${
                    themeMode === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${isSearching || selectedPlatform === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !prompt.trim() || selectedPlatform === 'all'}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    isSearching || !prompt.trim() || selectedPlatform === 'all'
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className={`mt-2 text-sm ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 복잡한 검색어 고민 NO! 평소 말하는 것처럼 자연스럽게 적어주세요.
              </p>
              <p className={`mt-2 text-sm ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 AI가 문맥을 파악해 지금 가장 잘 팔리는 &quot;인기 상품&quot;을 추천해 드릴게요.
              </p>
              {searchError && (
                <div className="mt-4 flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {/* 검색 결과 영역 */}
            {isSearching && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  themeMode === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  <span className={`text-lg ${
                    themeMode === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    AI가 상품을 분석 중입니다...
                  </span>
                </div>
              </div>
            )}

            {/* 검색 결과 표시 */}
            {currentProducts.length > 0 && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  themeMode === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <h2
                  className={`text-xl font-bold mb-6 ${
                    themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {currentProducts.length}개를 찾았습니다!{' '}
                  <span className={`ml-2 text-sm font-normal ${
                    themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    정확한 가격은 링크에서 확인해주세요!
                  </span>
                </h2>
                <div className="space-y-4">
                  {currentProducts.map((product, index) => {
                    const isSelected = isProductSelected(product.id)
                    const originalData = currentProductResponses[index]
                    const originalPrice = originalData?.originalPrice
                    const salePrice = originalData?.salePrice
                    const discountRate = originalData?.discountRate || originalData?.discount
                    const commissionRate = originalData?.commissionRate
                    const currency = originalData?.currency || 'KRW'
                    
                    // 할인율 계산 (originalPrice와 salePrice가 있으면)
                    let calculatedDiscount: string | undefined
                    if (originalPrice && salePrice && originalPrice > salePrice) {
                      const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                      calculatedDiscount = `${discountPercent}%`
                    }
                    const displayDiscount = discountRate || calculatedDiscount

                    // 예상 수익 계산 (salePrice * commissionRate)
                    let expectedRevenue: number | null = null
                    if (salePrice && commissionRate) {
                      // commissionRate를 숫자로 변환 (예: "10%" -> 0.1, "5.5%" -> 0.055)
                      const rateStr = String(commissionRate).replace(/%/g, '').trim()
                      const rateNum = parseFloat(rateStr)
                      if (!isNaN(rateNum)) {
                        expectedRevenue = salePrice * (rateNum / 100)
                      }
                    }

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductToggle(product)}
                        className={`flex gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? themeMode === 'dark'
                              ? 'border-purple-500 bg-purple-900/20'
                              : 'border-purple-500 bg-purple-50'
                            : themeMode === 'dark'
                              ? 'border-gray-600 bg-gray-800'
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`w-24 h-24 shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${
                          themeMode === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name || '제품 이미지'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className={`font-semibold text-base mb-2 line-clamp-2 ${
                              themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {product.name || '제품명 없음'}
                            </h4>
                            
                            {/* 가격 정보 */}
                            <div className="mb-2 space-y-1">
                              {originalPrice && salePrice ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {originalPrice > salePrice && (
                                    <span className={`text-sm line-through ${
                                      themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      {originalPrice.toLocaleString()} {currency}
                                    </span>
                                  )}
                                  <span className={`text-lg font-bold ${
                                    themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {salePrice.toLocaleString()} {currency}
                                  </span>
                                  {displayDiscount && (
                                    <span className="px-2 py-0.5 rounded bg-red-500 text-white text-xs font-medium">
                                      {displayDiscount} 할인
                                    </span>
                                  )}
                                </div>
                              ) : salePrice ? (
                                <p className={`text-lg font-bold ${
                                  themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {salePrice.toLocaleString()} {currency}
                                </p>
                              ) : (
                                <p className={`text-lg font-bold ${
                                  themeMode === 'dark' ? 'text-white' : 'text-gray-400'
                                }`}>
                                  약 {product.price ? product.price.toLocaleString() : '0'}원
                                </p>
                              )}
                              
                              {/* 수수료 표시 */}
                              {commissionRate && (
                                <p className={`text-xs ${
                                  themeMode === 'dark' ? 'text-green-400' : 'text-green-600'
                                }`}>
                                  수수료율: {commissionRate}
                                </p>
                              )}
                            </div>

                            {product.url && (
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className={`inline-flex items-center gap-1 text-sm hover:underline ${
                                  themeMode === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                }`}
                              >
                                상품 보기 <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>

                          {/* 예상 수익 (오른쪽 하단) */}
                          {expectedRevenue !== null && (
                            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-baseline gap-1">
                                  <span className={`text-xs ${
                                    themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    예상 수익
                                  </span>
                                  <span className={`text-lg font-bold ${
                                    themeMode === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                                  }`}>
                                    {Math.round(expectedRevenue).toLocaleString()} {currency}
                                  </span>
                                </div>
                                <p className={`text-xs ${
                                  themeMode === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                }`}>
                                  * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="shrink-0 flex items-center">
                            <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-medium">
                              선택됨
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 에러 메시지 표시 */}
            {searchError && !isSearching && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  themeMode === 'dark'
                    ? 'bg-red-900/20 border-red-700'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-base">{searchError}</span>
                </div>
              </div>
            )}

          </div>
        </div>
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-4 p-4 md:p-8 flex flex-col gap-6 w-80 xl:w-96" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <SelectedProductsPanel 
              productResponses={currentProductResponses}
              currentProducts={currentProducts}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
