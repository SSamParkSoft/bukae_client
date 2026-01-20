'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useStep1Container } from './hooks/useStep1Container'
import { useRouter } from 'next/navigation'
import {
  SearchUrlToggle,
  LoadingIndicator,
  ErrorMessage,
  SelectedProductCard,
  ProductCard,
} from './components'

export default function Step1Page() {
  const container = useStep1Container()
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<'search' | 'url'>('search')
  // SSR/CSR 일치 보장을 위해 클라이언트에서만 true로 설정
  const [hydrated] = useState(() => typeof window !== 'undefined')

  // 플레이스홀더 텍스트 생성
  const placeholder = useMemo(() => {
    if (container.selectedPlatform === 'all') {
      return '플랫폼을 선택해주세요'
    }
    
    const platformName = container.selectedPlatform === 'ALI_EXPRESS' ? '알리 익스프레스' : '쿠팡'
    
    if (searchMode === 'search') {
      return `${platformName}에서 검색하기`
    } else {
      return `${platformName} 상품 URL 입력`
    }
  }, [container.selectedPlatform, searchMode])

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
    <div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[1194px] mx-auto px-4 sm:px-6 pt-4 pb-8"
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
        <div className="mb-8 rounded-3xl bg-white/20 p-6 shadow-[var(--shadow-card-default)]">
          {/* 첫 번째 줄: 검색/URL 토글 + 플랫폼 선택 */}
          <div className="flex items-center justify-between mb-4">
            {/* 검색/URL 토글 */}
            <div className="flex-shrink-0">
              <SearchUrlToggle searchMode={searchMode} onModeChange={setSearchMode} />
            </div>
            
            {/* 플랫폼 선택 버튼들 */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => container.handlePlatformSelect('all')}
                className={`h-[68px] px-6 rounded-2xl text-[var(--font-size-20)] font-bold transition-all tracking-[-0.4px] leading-[28px] ${
                  container.selectedPlatform === 'all'
                    ? 'bg-[#5e8790] text-white'
                    : 'bg-white border border-[#5e8790] text-[#3b6574]'
                }`}
                style={{ width: '160px' }}
              >
                전체
              </button>
              <button
                onClick={() => container.handlePlatformSelect('COUPANG')}
                className={`h-[68px] px-6 rounded-2xl text-[var(--font-size-20)] font-bold transition-all tracking-[-0.4px] leading-[28px] ${
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
                className={`h-[68px] px-6 rounded-2xl text-[var(--font-size-20)] font-bold transition-all tracking-[-0.4px] leading-[28px] ${
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
              className="w-full h-[72px] pl-6 pr-16 rounded-2xl bg-white font-semibold text-[#2c2c2c] placeholder:text-[#2c2c2c] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed tracking-[-0.36px] shadow-[var(--shadow-card-default)]"
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

        {/* 검색 중 표시 */}
        {container.isSearching && <LoadingIndicator />}

        {/* 선택된 상품 섹션 */}
        {selectedCount > 0 && (
          <div className="mt-20 mb-20">
            <div className="flex items-center gap-3 mb-4">
              <h2 
                className="font-bold text-[#15252c] tracking-[-0.64px]"
                style={{ 
                  fontSize: 'var(--font-size-24)',
                  lineHeight: 'var(--line-height-32-140)'
                }}
              >
                선택된 상품
              </h2>
              <span 
                className="font-bold text-[#111111] tracking-[-0.32px]"
                style={{ 
                  fontSize: 'var(--font-size-8)',
                  lineHeight: 'var(--line-height-16-140)'
                }}
              >
                {selectedCount}개 선택됨
              </span>
            </div>
            <div className="rounded-2xl bg-white/60 border border-white/10 p-6 shadow-(--shadow-card-default)">
              {container.selectedProducts.map((product) => {
                const productResponse = container.currentProductResponses.find(
                  (r) => r.id === product.id
                )
                return (
                  <SelectedProductCard
                    key={product.id}
                    product={product}
                    productResponse={productResponse}
                    onRemove={container.handleProductToggle}
                  />
                )
              })}
              <button
                onClick={() => router.push('/video/create/step2')}
                className="w-full mt-4 py-4 rounded-2xl bg-[#5e8790] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#3b6574] transition-colors tracking-[-0.48px] shadow-(--shadow-card-default)"
                style={{ 
                  fontSize: 'var(--font-size-24)',
                  lineHeight: 'var(--line-height-24-140)'
                }}
              >
                다음 단계
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* 검색 결과 표시 */}
        {container.currentProducts.length > 0 && (
          <div className="mb-[84px]">
            <div className="flex items-center gap-3 mb-4">
              <h2 
                className="font-bold text-[#15252c] tracking-[-0.64px]"
                style={{ 
                  fontSize: 'var(--font-size-24)',
                  lineHeight: 'var(--line-height-32-140)'
                }}
              >
                {container.currentProducts.length}개를 찾았습니다!
              </h2>
              <span 
                className="font-bold text-[#111111] tracking-[-0.32px]"
                style={{ 
                  fontSize: 'var(--font-size-8)',
                  lineHeight: 'var(--line-height-16-140)'
                }}
              >
                정확한 가격은 링크에서 확인해주세요!
              </span>
            </div>
            <div className="rounded-2xl bg-white/20 border border-white/10 p-6 shadow-(--shadow-card-default)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {container.currentProducts.map((product, index) => {
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
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {container.searchError && !container.isSearching && (
          <ErrorMessage message={container.searchError} />
        )}
      </motion.div>
    </div>
  )
}
