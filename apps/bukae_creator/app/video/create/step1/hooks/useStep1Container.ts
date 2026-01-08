'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import type { Product } from '@/lib/types/domain/product'
import { useThemeStore } from '@/store/useThemeStore'
import { useUserStore } from '@/store/useUserStore'
import { searchProducts } from '@/lib/api/products'
import type { TargetMall, ProductResponse } from '@/lib/types/products'
import { convertProductResponseToProduct } from '@/lib/types/products'
import { useVideoCreateAuth } from '@/hooks/useVideoCreateAuth'
import { 
  requestCoupangExtensionStorage, 
  extractImagesFromStorage,
  testExtensionStorageAccess 
} from '@/lib/utils/coupang-extension-storage'

type ThemeMode = 'light' | 'dark'

// 플랫폼 정보
const platformInfo: Record<TargetMall, { name: string; enabled: boolean }> = {
  ALI_EXPRESS: { name: '알리익스프레스', enabled: true },
  COUPANG: { name: '쿠팡', enabled: true },
  AMAZON: { name: '아마존', enabled: false },
}

// 챗봇 메시지 타입
export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'error'
  content: string
  products?: Product[]
  timestamp: Date
}

export function useStep1Container() {
  const { 
    removeProduct, 
    addProduct,
    updateProduct,
    selectedProducts, 
    clearProducts, 
    setHasUnsavedChanges, 
    setSelectedImages,
    setTimeline,
    setScenes,
    autoSaveEnabled,
    hasUnsavedChanges
  } = useVideoCreateStore()
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
  const prevPlatformRef = useRef<TargetMall | 'all'>('all')

  // 토큰 검증
  const { isValidatingToken } = useVideoCreateAuth()

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Extension Storage에서 크롤링된 이미지 확인 및 업데이트
  useEffect(() => {
    const coupangProducts = selectedProducts.filter(p => p.platform === 'coupang')
    if (coupangProducts.length === 0) {
      return
    }

    // 이미 크롤링된 이미지가 있는 상품은 제외
    const productsNeedingImages = coupangProducts.filter(p => {
      const hasCrawledImages = p.images?.some(img => img.includes('coupangcdn.com'))
      return !hasCrawledImages
    })

    if (productsNeedingImages.length === 0) {
      return
    }

    let hasExtensionAccess = false
    let checkCount = 0
    const maxChecks = 10 // 최대 10번만 시도 (약 30초)
    let isStopped = false

    const loadCrawledImages = async () => {
      // 이미 모든 상품에 이미지가 있으면 중단
      const stillNeeding = selectedProducts.filter(p => 
        p.platform === 'coupang' && 
        !p.images?.some(img => img.includes('coupangcdn.com'))
      )
      if (stillNeeding.length === 0) {
        isStopped = true
        return
      }

      checkCount++
      if (checkCount > maxChecks) {
        isStopped = true
        return
      }

      // 한 번 실패하면 더 이상 시도하지 않음
      if (!hasExtensionAccess && checkCount > 3) {
        isStopped = true
        return
      }

      try {
        // Extension Storage 접근 가능 여부 테스트 (첫 3번만)
        if (checkCount <= 3) {
          const canAccess = await testExtensionStorageAccess()
          if (!canAccess) {
            return
          }
          hasExtensionAccess = true
        }

        const storageData = await requestCoupangExtensionStorage()
        if (!storageData) {
          return
        }

        // 각 쿠팡 상품에 대해 크롤링된 이미지 확인 및 업데이트
        for (const product of stillNeeding) {
          const crawledImages = extractImagesFromStorage(storageData, product.id)
          
          // 크롤링된 이미지가 있고, 기존 images와 다르면 업데이트
          if (crawledImages.length > 0) {
            const existingImages = product.images || []
            const hasNewImages = crawledImages.some(img => 
              img.includes('coupangcdn.com') && !existingImages.includes(img)
            )

            if (hasNewImages) {
              // 기존 이미지와 크롤링된 이미지 합치기 (중복 제거)
              const allImages = [...new Set([...existingImages, ...crawledImages])]
              updateProduct(product.id, { images: allImages })
            }
          }
        }
      } catch {
        // 에러는 무시 (크롤링이 안 되어 있을 수 있음)
      }
    }

    // 주기적으로 확인 (5초마다, 첫 3번은 3초마다)
    const initialDelay = 1000
    const normalInterval = 5000
    const quickInterval = 3000

    let timeoutId: NodeJS.Timeout

    const scheduleNext = (delay: number) => {
      if (isStopped) {
        return
      }

      timeoutId = setTimeout(() => {
        loadCrawledImages().then(() => {
          // loadCrawledImages에서 이미 isStopped를 설정했으므로 확인만 하면 됨
          if (isStopped) {
            return
          }

          if (checkCount < 3) {
            scheduleNext(quickInterval)
          } else {
            scheduleNext(normalInterval)
          }
        })
      }, delay)
    }

    // 첫 실행은 1초 후
    scheduleNext(initialDelay)

    return () => {
      isStopped = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [selectedProducts, updateProduct])

  // 확장프로그램이 자동으로 전송하는 메시지 감지
  useEffect(() => {
    const messageHandler = async (event: MessageEvent) => {
      // Extension Storage 응답 메시지 확인
      if (
        event.data?.type === 'COUPANG_STORAGE_RESPONSE' ||
        event.data?.products ||
        event.data?.productimages ||
        event.data?.productDetaillmages ||
        event.data?.productDetailImages
      ) {
        const coupangProducts = selectedProducts.filter(p => p.platform === 'coupang')
        if (coupangProducts.length === 0) {
          return
        }

        try {
          const storageData = event.data.data || event.data
          if (!storageData) {
            return
          }

          // 각 쿠팡 상품에 대해 크롤링된 이미지 확인 및 업데이트
          for (const product of coupangProducts) {
            const crawledImages = extractImagesFromStorage(storageData, product.id)
            
            if (crawledImages.length > 0) {
              const existingImages = product.images || []
              const allImages = [...new Set([...existingImages, ...crawledImages])]
              updateProduct(product.id, { images: allImages })
            }
          }
        } catch {
          // 에러는 무시
        }
      }
    }

    window.addEventListener('message', messageHandler)
    return () => window.removeEventListener('message', messageHandler)
  }, [selectedProducts, updateProduct])

  // 상품/이미지 초기화 헬퍼 함수 (검색 결과는 유지)
  const resetProductData = useCallback(() => {
    // 선택된 이미지 초기화
    setSelectedImages([])
    // 타임라인 및 씬 데이터 초기화 (다른 플랫폼의 이미지가 남아있지 않도록)
    setTimeline(null)
    setScenes([])
    // 검색 결과는 유지 (플랫폼 변경 시에만 초기화)
  }, [setSelectedImages, setTimeline, setScenes])

  // 플랫폼 변경 시 검색 결과도 함께 초기화하는 함수
  const resetSearchData = useCallback(() => {
    // 검색 결과 초기화
    setCurrentProducts([])
    setCurrentProductResponses([])
    // 검색어 초기화
    setPrompt('')
    // 채팅 메시지 초기화
    setChatMessages([])
  }, [])

  // 플랫폼 선택 핸들러
  const handlePlatformSelect = useCallback((platform: TargetMall | 'all') => {
    // 플랫폼이 실제로 변경된 경우에만 초기화
    if (prevPlatformRef.current !== platform && prevPlatformRef.current !== 'all') {
      // 선택된 상품 초기화
      clearProducts()
      // 상품 관련 데이터 초기화
      resetProductData()
      // 검색 결과도 초기화 (플랫폼 변경 시에만)
      resetSearchData()
    }
    prevPlatformRef.current = platform
    setSelectedPlatform(platform)
    setSearchError(null)
  }, [clearProducts, resetProductData, resetSearchData])

  // 상품 선택/해제
  const isProductSelected = useCallback((productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }, [selectedProducts])

  const handleProductToggle = useCallback((product: Product) => {
    if (isProductSelected(product.id)) {
      // 이미 선택된 상품이면 선택 해제
      removeProduct(product.id)
      setHasUnsavedChanges(true)
      // 선택 해제 시 이미지/타임라인/씬만 초기화 (검색 결과는 유지)
      resetProductData()
    } else {
      const currentProduct = selectedProducts[0]
      const isSameProduct = currentProduct?.id === product.id
      
      // 같은 상품이더라도 임시저장하지 않은 경우 초기화
      // 임시저장한 경우만 유지 (autoSaveEnabled === true && hasUnsavedChanges === false)
      const shouldPreserveData = isSameProduct && autoSaveEnabled && !hasUnsavedChanges
      
      if (!shouldPreserveData) {
        // 새로운 상품이거나 임시저장하지 않은 경우 이미지/타임라인/씬만 초기화 (검색 결과는 유지)
        clearProducts()
        resetProductData()
      }
      
      addProduct(product)
      setHasUnsavedChanges(true)
    }
  }, [isProductSelected, removeProduct, setHasUnsavedChanges, resetProductData, clearProducts, addProduct, selectedProducts, autoSaveEnabled, hasUnsavedChanges])

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
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isSearching) {
      e.preventDefault()
      handleSearch()
    }
  }, [isSearching, handleSearch])

  const themeMode: ThemeMode = theme

  return {
    // State
    theme: themeMode,
    isValidatingToken,
    
    // Platform
    selectedPlatform,
    platformInfo,
    handlePlatformSelect,
    
    // Search
    prompt,
    setPrompt,
    isSearching,
    searchError,
    handleSearch,
    handleKeyPress,
    
    // Products
    currentProducts,
    currentProductResponses,
    selectedProducts,
    isProductSelected,
    handleProductToggle,
    
    // Messages
    chatMessages,
    messagesEndRef,
  }
}
