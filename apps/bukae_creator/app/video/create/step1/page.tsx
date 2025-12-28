'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Loader2, AlertCircle, Send, Globe, Sparkles, Search, ShoppingCart, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { useVideoCreateStore, Product } from '../../../../store/useVideoCreateStore'
import { useThemeStore } from '../../../../store/useThemeStore'
import { useUserStore } from '../../../../store/useUserStore'
import StepIndicator from '../../../../components/StepIndicator'
import SelectedProductsPanel from '../../../../components/SelectedProductsPanel'
import { searchProducts } from '@/lib/api/products'
import { ProductSearchWebSocket } from '@/lib/api/product-search-websocket'
import type { TargetMall, ProductResponse } from '@/lib/types/products'
import { convertProductResponseToProduct } from '@/lib/types/products'

type ThemeMode = 'light' | 'dark'

// 플랫폼 정보
const platformInfo: Record<TargetMall, { name: string; enabled: boolean }> = {
  ALI_EXPRESS: { name: '알리익스프레스', enabled: true },
  COUPANG: { name: '쿠팡', enabled: false },
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
  const { removeProduct, addProduct, selectedProducts } = useVideoCreateStore()
  const theme = useThemeStore((state) => state.theme)
  const { getPlatformTrackingId } = useUserStore()

  // 상태 관리
  const [selectedPlatform, setSelectedPlatform] = useState<TargetMall | 'all'>('all')
  const [prompt, setPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [currentCorrelationId, setCurrentCorrelationId] = useState<string | null>(null)
  const [currentProducts, setCurrentProducts] = useState<Product[]>([])
  const websocketRef = useRef<ProductSearchWebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // WebSocket 정리
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.disconnect()
        websocketRef.current = null
      }
    }
  }, [])

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
      removeProduct(product.id)
    } else {
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

    // 기존 WebSocket 연결 정리
    if (websocketRef.current) {
      websocketRef.current.disconnect()
      websocketRef.current = null
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

      // API 호출
      const response = await searchProducts({
        query: prompt,
        targetMall: selectedPlatform,
        userTrackingId: trackingId,
      })

      setCurrentCorrelationId(response.correlationId)

      // WebSocket 연결 및 구독
      const ws = new ProductSearchWebSocket(
        response.correlationId,
        (products: ProductResponse[]) => {
          // 상품 목록 수신
          console.log('[ProductSearch] API 응답 받은 원본 상품 데이터:', products)
          // 각 상품의 원본 데이터 상세 로그
          products.forEach((p, index) => {
            console.log(`[ProductSearch] 원본 상품 ${index + 1}:`, {
              전체데이터: p,
              id: p.id,
              productId: p.productId,
              name: p.name,
              price: p.price,
              image: p.image,
              thumbnailUrl: p.thumbnailUrl,
              url: p.url,
              productUrl: p.productUrl,
              platform: p.platform,
            })
          })
          const convertedProducts = products.map((p) => {
            const converted = convertProductResponseToProduct(p, selectedPlatform)
            console.log('[ProductSearch] 변환된 상품:', {
              id: converted.id,
              name: converted.name,
              price: converted.price,
              url: converted.url,
              image: converted.image,
            })
            return converted
          })
          setCurrentProducts(convertedProducts)

          // AI 응답 메시지 추가
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: `${products.length}개의 상품을 찾았습니다. (환율로 인해 정확하지 않으니 정확한 가격은 링크를 통해 확인해주세요!)`,
            products: convertedProducts,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, assistantMessage])
          setIsSearching(false)
        },
        (error: string) => {
          // 에러 메시지 추가
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            type: 'error',
            content: error,
            timestamp: new Date(),
          }
          setChatMessages((prev) => [...prev, errorMessage])
          setSearchError(error)
          setIsSearching(false)
        },
        () => {
          // 연결 종료
          console.log('[ProductSearchWebSocket] 연결 종료')
        }
      )

      websocketRef.current = ws
      await ws.connect()
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

  // 다음 단계로 이동
  const handleNext = () => {
    if (selectedProducts.length > 0) {
      router.push('/video/create/step2')
    }
  }

  const themeMode: ThemeMode = theme

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
                  placeholder="예: Spoon and Chopstick Set / 수저세트, 주방용품, 50000, 20"
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
                💡 <strong>영문 상품명 / 한글 상품명, 카테고리, 가격(원), 개수 순서로 입력하세요.</strong> 
              </p>
              <p className={`mt-2 text-sm ${
                themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 &quot;영문 상품명 / 한글 상품명&quot;으로 작성하면 검색 정확도가 높아져요!
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
                    상품을 검색하고 있습니다...
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
                    환율로 인해 실제 가격은 링크에서 확인해주세요!
                  </span>
                </h2>
                <div className="space-y-4">
                  {currentProducts.map((product) => {
                    const isSelected = isProductSelected(product.id)
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
                        <div className={`w-24 h-24 flex-shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${
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
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-base mb-2 line-clamp-2 ${
                            themeMode === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {product.name || '제품명 없음'}
                          </h4>
                          <p className={`text-lg font-bold mb-2 ${
                            themeMode === 'dark' ? 'text-white' : 'text-gray-400'
                          }`}>
                            약 {product.price ? product.price.toLocaleString() : '0'}원
                          </p>
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
                        {isSelected && (
                          <div className="flex-shrink-0 flex items-center">
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

            {/* 다음 단계 버튼 */}
            {selectedProducts.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-6 py-3 text-base font-medium text-white hover:bg-purple-600 transition-colors"
                >
                  이 상품 활용해서 제작하기
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="hidden lg:block p-4 md:p-8 flex-shrink-0">
          <div className="sticky top-8 flex flex-col gap-6 w-72 xl:w-80">
            <SelectedProductsPanel />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
