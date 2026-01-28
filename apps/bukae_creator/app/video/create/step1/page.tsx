'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { useStep1Container } from './hooks/useStep1Container'
import { useRouter } from 'next/navigation'
import {
  SearchUrlToggle,
  LoadingIndicator,
  ErrorMessage,
  ProductCard,
  ProductCardSkeleton,
  SelectedProductCard,
} from './components'

const ITEMS_PER_PAGE = 6 // 한 번에 추가로 표시할 아이템 수

export default function Step1Page() {
  const container = useStep1Container()
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<'search' | 'url'>('search')
  // SSR/CSR 일치 보장을 위해 클라이언트에서만 true로 설정
  const [hydrated] = useState(() => typeof window !== 'undefined')
  
  // 무한 스크롤을 위한 ref
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const hasTriggeredRef = useRef(false) // 트리거 중복 방지용 ref
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTriggerTimeRef = useRef(0)
  
  // 페이지 상태 결정
  const showSearchPage = !container.isSearching && container.currentProducts.length === 0
  const showLoadingPage = container.isSearching
  const showResultsPage = !container.isSearching && container.currentProducts.length > 0

  // Intersection Observer로 무한 스크롤 구현 (검색 결과 페이지에서만)
  useEffect(() => {
    // 로딩이 완료되면 트리거 플래그 리셋
    hasTriggeredRef.current = false
    
    // throttle된 loadMoreProducts 함수
    const throttledLoadMore = () => {
      const now = Date.now()
      const THROTTLE_DELAY = 300 // 300ms throttle
      
      if (throttleTimerRef.current) {
        return // 이미 스케줄된 호출이 있으면 무시
      }
      
      const timeSinceLastRun = now - lastTriggerTimeRef.current
      
      if (timeSinceLastRun >= THROTTLE_DELAY) {
        // 즉시 실행
        lastTriggerTimeRef.current = now
        if (container.hasMoreProducts && !container.isLoadingMore && !hasTriggeredRef.current) {
          hasTriggeredRef.current = true
          container.loadMoreProducts()
        }
      } else {
        // 나중에 실행
        throttleTimerRef.current = setTimeout(() => {
          lastTriggerTimeRef.current = Date.now()
          throttleTimerRef.current = null
          if (container.hasMoreProducts && !container.isLoadingMore && !hasTriggeredRef.current) {
            hasTriggeredRef.current = true
            container.loadMoreProducts()
          }
        }, THROTTLE_DELAY - timeSinceLastRun)
      }
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          throttledLoadMore()
        }
      },
      { 
        threshold: 0,
        rootMargin: '500px' // 화면 하단 500px 전에 미리 로드
      }
    )
    
    // loadMoreRef가 DOM에 렌더링될 때까지 기다리기 (최대 10번 재시도)
    let retryCount = 0
    const maxRetries = 10
    
    const checkAndObserve = () => {
      const currentRef = loadMoreRef.current
      if (currentRef) {
        observer.observe(currentRef)
      } else {
        retryCount++
        if (retryCount < maxRetries) {
          // 100ms 후 다시 시도
          setTimeout(checkAndObserve, 100)
        }
      }
    }
    
    // 초기 체크 및 재시도
    const timeoutId = setTimeout(checkAndObserve, 100)
    
    return () => {
      clearTimeout(timeoutId)
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current)
        throttleTimerRef.current = null
      }
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResultsPage, container.hasMoreProducts, container.isLoadingMore, container.currentProducts.length, container.visibleProducts.length])

  const selectedCount = container.selectedProducts.length

  // SSR/CSR 일치 보장을 위해 초기 렌더는 로딩 UI 고정
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-background-start">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-teal" />
          <p className="text-brand-teal-dark">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-background-start">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-teal" />
          <p className="text-brand-teal-dark">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1194px] mx-auto px-4 sm:px-6 pt-4 pb-8 relative">
      <AnimatePresence mode="wait">
        {/* 검색 페이지 */}
        {showSearchPage && (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 헤더 섹션 */}
            <div className="mb-24 mt-[72px]">
              <div className="flex items-center justify-center mb-4">
                <span 
                  className="font-bold bg-linear-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
                  style={{ 
                    fontSize: 'var(--font-size-28)',
                    lineHeight: 'var(--line-height-28-140)'
                  }}
                >
                  STEP 1
                </span>
              </div>
              <h1 
                className="text-center font-bold mb-2 bg-linear-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
                style={{ 
                  fontSize: 'var(--font-size-32)',
                  lineHeight: 'var(--line-height-32-140)'
                }}
              >
                무엇을 제작해볼까요?
              </h1>
              <p 
                className="text-center font-semibold text-brand-teal-dark tracking-[-0.36px]"
                style={{ 
                  fontSize: 'var(--font-size-18)',
                  lineHeight: 'var(--line-height-18-140)'
                }}
              >
                원하는 플랫폼과 상품을 검색해주세요.
              </p>
            </div>

            {/* 검색 영역 - 피그마 디자인에 맞춘 통합 프레임 */}
            <div className="mb-8 rounded-3xl bg-white/20 p-6 shadow-(--shadow-card-default)">
              {/* 첫 번째 줄: 검색/URL 토글 + 플랫폼 선택 */}
              <div className="flex items-center justify-between mb-4">
                {/* 검색/URL 토글 */}
                <div className="shrink-0">
                  <SearchUrlToggle searchMode={searchMode} onModeChange={setSearchMode} />
                </div>
                
                {/* 플랫폼 선택 버튼들 */}
                <div className="flex items-center gap-4">
                  {/* <button
                    onClick={() => container.handlePlatformSelect('all')}
                    className={`h-[68px] px-6 rounded-2xl text-(--font-size-20) font-bold transition-all tracking-[-0.4px] leading-[28px] ${
                      container.selectedPlatform === 'all'
                        ? 'bg-[#5e8790] text-white'
                        : 'bg-white border border-[#5e8790] text-[#3b6574]'
                    }`}
                    style={{ width: '160px' }}
                  >
                    전체
                  </button> */}
                  <button
                    onClick={() => container.handlePlatformSelect('COUPANG')}
                    className={`h-[68px] px-6 rounded-2xl text-(--font-size-20) font-bold transition-all tracking-[-0.4px] leading-[28px] ${
                      container.selectedPlatform === 'COUPANG'
                        ? 'bg-[#5e8790] text-white'
                        : 'bg-white border border-[#5e8790] text-[#3b6574]'
                    }`}
                    style={{ width: '160px' }}
                  >
                    쿠팡
                  </button>
                  <button
                    onClick={() => container.handlePlatformSelect('ALI_EXPRESS')}
                    className={`h-[68px] px-6 rounded-2xl text-(--font-size-20) font-bold transition-all tracking-[-0.4px] leading-[28px] ${
                      container.selectedPlatform === 'ALI_EXPRESS'
                        ? 'bg-[#5e8790] text-white'
                        : 'bg-white border border-[#5e8790] text-[#3b6574]'
                    }`}
                    style={{ width: '160px' }}
                  >
                    알리 익스프레스
                  </button>
                </div>
              </div>

              {/* 두 번째 줄: 검색 입력 필드 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색어 고민은 그만, 평소 말하듯 편하게 검색해 보세요."
                  value={container.prompt}
                  onChange={(e) => container.setPrompt(e.target.value)}
                  onKeyPress={container.handleKeyPress}
                  disabled={container.isSearching || container.selectedPlatform === 'all'}
                  className="w-full h-[72px] pl-6 pr-16 rounded-2xl bg-white font-semibold text-[#2c2c2c] placeholder:text-[#2c2c2c] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed tracking-[-0.36px] shadow-(--shadow-card-default)"
                  style={{ 
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px'
                  }}
                />
                <button
                  onClick={container.handleSearch}
                  disabled={container.isSearching || container.selectedPlatform === 'all' || !container.prompt.trim()}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {container.isSearching ? (
                    <Loader2 className="w-10 h-10 animate-spin text-teal-900" />
                  ) : (
                    <Image 
                      src="/send.svg" 
                      alt="전송" 
                      width={40} 
                      height={40}
                      className="w-10 h-10"
                    />
                  )}
                </button>
              </div>
            </div>

            {/* 예시 텍스트 */}
            <p 
              className="text-right font-semibold text-brand-teal-dark tracking-[-0.36px)"
              style={{ 
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)'
              }}
            >
              ex) 화장실에서 심심할 때 읽을 거리, 캠핑장의 완벽한 밀키트
            </p>
          </motion.div>
        )}

        {/* 로딩 페이지 */}
        {showLoadingPage && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <LoadingIndicator />
          </motion.div>
        )}

        {/* 검색 결과 페이지 */}
        {showResultsPage && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative pb-[160px]" // 선택된 상품 고정 영역 높이만큼 여유를 둬 스크롤 시 마지막 카드가 가려지지 않도록 처리
          >

            {/* 검색 결과 표시 - 무한 스크롤 */}
            <div className="mb-[84px] mt-20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 
                    className="font-bold text-[#15252c] tracking-[-0.64px]"
                    style={{ 
                      fontSize: 'var(--font-size-32)',
                      lineHeight: 'var(--line-height-44-140)'
                    }}
                  >
                    {container.currentProducts.length}개를 찾았습니다!
                  </h2>
                  <span 
                    className="font-bold text-[#111111] tracking-[-0.32px]"
                    style={{ 
                      fontSize: 'var(--font-size-16)',
                      lineHeight: 'var(--line-height-24-140)'
                    }}
                  >
                    정확한 가격은 링크에서 확인해주세요!
                  </span>
                </div>
                <button
                  onClick={container.resetSearchData}
                  className="flex items-center justify-center gap-3 px-10 h-[68px] rounded-2xl bg-[#5e8790] text-white font-bold hover:bg-[#3b6574] transition-colors tracking-[-0.48px]"
                  style={{ 
                    fontSize: 'var(--font-size-24)',
                    lineHeight: 'var(--line-height-24-140)',
                    minWidth: '320px'
                  }}
                >
                  <Image 
                    src="/send.svg" 
                    alt="다시 검색하기" 
                    width={16} 
                    height={16}
                    className="w-4 h-4 brightness-0 invert"
                  />
                  다시 검색하기
                </button>
              </div>
              <div className="rounded-2xl bg-white/20 border border-white/10 p-6 shadow-(--shadow-card-default)">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {container.visibleProducts.map((product, index) => {
                    const productResponse = container.currentProductResponses[index]
                    return (
                      <ProductCard
                        key={product.id}
                        product={product}
                        productResponse={productResponse}
                        isSelected={container.isProductSelected(product.id)}
                        onToggle={container.handleProductToggle}
                      />
                    )
                  })}
                  
                  {/* 스켈레톤 UI - 더 불러오는 중일 때 */}
                  {container.isLoadingMore && (
                    <>
                      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                        <ProductCardSkeleton key={`skeleton-${index}`} />
                      ))}
                    </>
                  )}
                </div>
                
                {/* 무한 스크롤 트리거 - 항상 렌더링 */}
                <div 
                  ref={loadMoreRef} 
                  className="w-full h-1 mt-8"
                />
              </div>
            </div>

            {/* 에러 메시지 표시 */}
            {container.searchError && (
              <ErrorMessage message={container.searchError} />
            )}

            {/* 선택된 상품 섹션 - 화면 기준 오른쪽 하단 (컨텐츠 여백 맞춤) */}
            {selectedCount > 0 && (() => {
              const product = container.selectedProducts[0]
              const productResponse = container.currentProductResponses.find(
                (r) => String(r.id ?? r.productId) === String(product.id)
              )
              return (
                <div
                  className="fixed bottom-2 z-50 w-fit transform origin-bottom-right"
                  style={{
                    right: 'calc((100vw - 1194px) / 2 + 24px)',
                  }}
                >
                  <div className="rounded-2xl bg-[#5E8790]/20 p-4 shadow-(--shadow-card-default) backdrop-blur-lg transform origin-bottom-right">
                    {/* 상품 내용과 X 버튼을 나란히 배치 */}
                    <div className="flex items-start gap-4 mb-3 shrink-0">
                      {/* 선택된 상품 카드 */}
                      <div style={{ width: '440px' }}>
                        <SelectedProductCard
                          key={product.id}
                          product={product}
                          productResponse={productResponse}
                        />
                      </div>
                      {/* X 버튼 */}
                      <button
                        type="button"
                        onClick={() => container.handleProductToggle(product)}
                        className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-white/20 transition-colors shrink-0"
                      >
                        <X className="w-5 h-5 text-black" />
                      </button>
                    </div>
                    {/* 다음 단계 버튼 - 상품 내용 + X 버튼의 전체 너비 사용 */}
                    <button
                      onClick={() => router.push('/video/create/step2')}
                      className="h-20 rounded-2xl bg-[#5e8790] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#3b6574] transition-colors tracking-[-0.48px] shadow-(--shadow-card-default) w-full"
                      style={{ 
                        fontSize: 'var(--font-size-24)',
                        lineHeight: 'var(--line-height-16-140)',
                      }}
                    >
                      다음 단계
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
