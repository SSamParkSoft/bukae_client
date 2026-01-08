'use client'

import { useState, useMemo } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useStep1Container } from './hooks/useStep1Container'
import { useRouter } from 'next/navigation'
import {
  SearchUrlToggle,
  PlatformSelector,
  SearchInput,
  LoadingIndicator,
  ErrorMessage,
  SelectedProductCard,
  ProductCard,
} from './components'

export default function Step1Page() {
  const container = useStep1Container()
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<'search' | 'url'>('search')

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
      <div className="w-full max-w-[1194px] mx-auto px-4 sm:px-6 py-8">
        {/* 헤더 섹션 */}
        <div className="mb-20 mt-[96px]">
          <div className="flex items-center justify-center mb-4">
            <span 
              className="font-bold bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px]"
              style={{ 
                fontSize: 'var(--font-size-28)',
                lineHeight: 'var(--line-height-28-140)'
              }}
            >
              STEP 1
            </span>
          </div>
          <h1 
            className="text-center font-bold mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px]"
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
            원하는 플랫폼과 상품을 선택하세요
          </p>
        </div>

        {/* 검색/URL 탭 */}
        <SearchUrlToggle searchMode={searchMode} onModeChange={setSearchMode} />

        {/* 플랫폼 선택 카테고리 */}
        <PlatformSelector
          selectedPlatform={container.selectedPlatform}
          onPlatformSelect={container.handlePlatformSelect}
        />

        {/* 검색 입력 필드 */}
        <SearchInput
          placeholder={placeholder}
          value={container.prompt}
          onChange={container.setPrompt}
          onKeyPress={container.handleKeyPress}
          onSearch={container.handleSearch}
          isSearching={container.isSearching}
          disabled={container.isSearching || container.selectedPlatform === 'all'}
        />

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
            <div className="rounded-2xl bg-white/60 border border-white/10 p-6 shadow-[var(--shadow-card-default)]">
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
                className="w-full mt-4 py-4 rounded-2xl bg-[#5e8790] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#3b6574] transition-colors tracking-[-0.48px] shadow-[var(--shadow-card-default)]"
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
            <div className="rounded-2xl bg-white/20 border border-white/10 p-6 shadow-[var(--shadow-card-default)]">
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
      </div>
    </div>
  )
}
