'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Loader2, AlertCircle, Send, ShoppingCart, ExternalLink, Search, ArrowRight } from 'lucide-react'
import { useStep1Container } from './hooks/useStep1Container'
import type { TargetMall } from '@/lib/types/products'
import { useRouter } from 'next/navigation'

export default function Step1Page() {
  const container = useStep1Container()
  const router = useRouter()
  const [searchMode, setSearchMode] = useState<'search' | 'url'>('search')

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

  const selectedCount = container.selectedProducts.length

  return (
    <div>
      <div className="max-w-container-xl mx-auto px-6 py-8">
        {/* 헤더 섹션 */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-[var(--font-size-28)] font-bold bg-gradient-to-r from-text-dark via-brand-teal-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.56px] leading-[var(--line-height-28-140)]">
              STEP 1
            </span>
          </div>
          <h1 className="text-center text-[var(--font-size-32)] font-bold mb-2 bg-gradient-to-r from-text-dark to-brand-teal-dark bg-clip-text text-transparent tracking-[-0.64px] leading-[var(--line-height-32-140)]">
            무엇을 제작해볼까요?
          </h1>
          <p className="text-center text-[var(--font-size-18)] font-semibold text-brand-teal-dark tracking-[-0.36px] leading-[var(--line-height-18-140)]">
            원하는 플랫폼과 상품을 선택하세요
          </p>
        </div>

        {/* 검색/URL 탭 */}
        <div className="mb-6">
          <div className="inline-flex rounded-[60px] bg-bg-gray-light p-2">
            <button
              onClick={() => setSearchMode('search')}
              className={`px-6 py-3 rounded-[60px] text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[var(--line-height-24-140)] ${
                searchMode === 'search'
                  ? 'bg-white text-text-dark'
                  : 'bg-transparent text-text-tertiary'
              }`}
            >
              상품 검색
            </button>
            <button
              onClick={() => setSearchMode('url')}
              className={`px-6 py-3 rounded-[60px] text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[var(--line-height-24-140)] ${
                searchMode === 'url'
                  ? 'bg-white text-text-dark'
                  : 'bg-transparent text-text-tertiary'
              }`}
            >
              URL
            </button>
          </div>
        </div>

        {/* 플랫폼 선택 카테고리 */}
        <div className="mb-6 rounded-[20px] bg-white/20 border border-white/10 p-6">
          <div className="flex items-center gap-4 mb-4">
            {(Object.keys(container.platformInfo) as TargetMall[]).map((platform) => {
              const info = container.platformInfo[platform]
              const isSelected = container.selectedPlatform === platform
              return (
                <button
                  key={platform}
                  onClick={() => container.handlePlatformSelect(platform)}
                  disabled={!info.enabled}
                  className={`px-6 py-4 rounded-lg text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[var(--line-height-24-140)] ${
                    isSelected
                      ? 'bg-brand-teal text-brand-background'
                      : 'bg-white text-brand-teal-dark'
                  } ${!info.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {info.name}
                </button>
              )
            })}
          </div>
          <div className="text-[var(--font-size-16)] font-medium text-text-muted leading-[var(--line-height-16-140)] tracking-[-0.16px]">
            💡 복잡한 검색어 고민 NO! 평소 말하는 것처럼 자연스럽게 적어주세요.
            <br />
            💡 AI가 문맥을 파악해 지금 가장 잘 팔리는 '인기 상품'을 추천해 드릴게요.
            <br />
            💡 예) 화장실에서 심심할 때 좋은 거, 캠핑 가서 먹기 좋은 밀키트
          </div>
        </div>

        {/* 검색 입력 필드 */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="알리 익스프레스에서 검색하기"
              value={container.prompt}
              onChange={(e) => container.setPrompt(e.target.value)}
              onKeyPress={container.handleKeyPress}
              disabled={container.isSearching || container.selectedPlatform === 'all'}
              className="w-full pl-6 pr-14 py-4 rounded-[60px] bg-white/80 text-[var(--font-size-18)] font-semibold text-text-secondary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed tracking-[-0.36px] leading-[var(--line-height-18-140)]"
            />
            <button
              onClick={container.handleSearch}
              disabled={container.isSearching || !container.prompt.trim() || container.selectedPlatform === 'all'}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-brand-teal hover:bg-brand-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {container.isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Search className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* 검색 중 표시 */}
        {container.isSearching && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#15252c]" />
            <span className="text-[var(--font-size-32)] font-bold text-[#15252c] tracking-[-0.64px] leading-[var(--line-height-32-140)]">
              AI가 상품을 분석중이에요
            </span>
          </div>
        )}

        {/* 선택된 상품 섹션 */}
        {selectedCount > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[var(--font-size-32)] font-bold text-[#15252c] tracking-[-0.64px] leading-[var(--line-height-32-140)]">
                선택된 상품
              </h2>
              <span className="text-[var(--font-size-16)] font-bold text-[#111111] tracking-[-0.32px] leading-[var(--line-height-16-140)]">
                {selectedCount}개 선택됨
              </span>
            </div>
            <div className="rounded-2xl bg-white/60 border border-white/10 p-6">
              {container.selectedProducts.map((product) => {
                const productResponse = container.currentProductResponses.find(
                  (r) => r.id === product.id
                )
                const originalPrice = productResponse?.originalPrice
                const salePrice = productResponse?.salePrice || product.price
                const discountRate = productResponse?.discountRate || productResponse?.discount
                const commissionRate = productResponse?.commissionRate
                const currency = productResponse?.currency || 'KRW'

                // 할인율 계산
                let calculatedDiscount: string | undefined
                if (originalPrice && salePrice && originalPrice > salePrice) {
                  const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                  calculatedDiscount = `${discountPercent}%`
                }
                const displayDiscount = discountRate || calculatedDiscount

                // 예상 수익 계산
                let expectedRevenue: number | null = null
                if (salePrice && commissionRate) {
                  const rateStr = String(commissionRate).replace(/%/g, '').trim()
                  const rateNum = parseFloat(rateStr)
                  if (!isNaN(rateNum)) {
                    expectedRevenue = salePrice * (rateNum / 100)
                  }
                }

                return (
                  <div key={product.id} className="flex gap-4 mb-4 last:mb-0">
                    <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#a6a6a6]">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name || '제품 이미지'}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingCart className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[var(--font-size-18)] font-semibold text-[#111111] mb-2 line-clamp-2 tracking-[-0.36px] leading-[var(--line-height-18-140)]">
                        {product.name || '제품명 없음'}
                      </h3>
                      <div className="mb-2">
                        {originalPrice && salePrice && originalPrice > salePrice ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-medium text-[#a6a6a6] line-through tracking-[-0.14px] leading-[19.6px]">
                              {originalPrice.toLocaleString()} {currency}
                            </span>
                            <span className="text-[var(--font-size-24)] font-bold text-[#111111] tracking-[-0.48px] leading-[var(--line-height-24-140)]">
                              {salePrice.toLocaleString()} {currency}
                            </span>
                            {displayDiscount && (
                              <span className="px-2 py-1 rounded bg-[#dc2626] text-white text-[14px] font-bold tracking-[-0.14px] leading-[22.4px]">
                                {displayDiscount} 할인
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--font-size-24)] font-bold text-[#111111] tracking-[-0.48px] leading-[var(--line-height-24-140)]">
                            {salePrice ? `${salePrice.toLocaleString()} ${currency}` : '가격 정보 없음'}
                          </span>
                        )}
                      </div>
                      {commissionRate && (
                        <p className="text-[var(--font-size-14)] font-bold text-[#5e8790] mb-2 tracking-[-0.14px] leading-[var(--line-height-14-140)]">
                          수수료율: {commissionRate}
                        </p>
                      )}
                      {expectedRevenue !== null && (
                        <div className="mt-3 pt-3 border-t border-[#a6a6a6]">
                          <div className="flex items-end justify-end gap-2">
                            <span className="text-[12px] font-medium text-[#111111] leading-[16.8px]">예상 수익</span>
                            <span className="text-[var(--font-size-20)] font-bold text-[#111111] tracking-[-0.4px] leading-[var(--line-height-20-140)]">
                              {Math.round(expectedRevenue).toLocaleString()} {currency}
                            </span>
                          </div>
                          <p className="text-[12px] font-medium text-[#5d5d5d] text-right mt-1 leading-[16.8px]">
                            * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => container.handleProductToggle(product)}
                      className="shrink-0 px-4 py-2 rounded-lg bg-[#e4eeed] text-[#111111] text-[var(--font-size-12)] font-bold hover:bg-[#d4e0df] transition-colors leading-[var(--line-height-12-140)]"
                    >
                      선택
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => router.push('/video/create/step2')}
                className="w-full mt-4 py-4 rounded-2xl bg-[#5e8790] text-white text-[var(--font-size-24)] font-bold flex items-center justify-center gap-2 hover:bg-[#3b6574] transition-colors tracking-[-0.48px] leading-[var(--line-height-24-140)]"
              >
                다음 단계
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* 검색 결과 표시 */}
        {container.currentProducts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[var(--font-size-32)] font-bold text-[#15252c] tracking-[-0.64px] leading-[var(--line-height-32-140)]">
                {container.currentProducts.length}개를 찾았습니다!
              </h2>
              <span className="text-[var(--font-size-16)] font-bold text-[#111111] tracking-[-0.32px] leading-[var(--line-height-16-140)]">
                정확한 가격은 링크에서 확인해주세요!
              </span>
            </div>
            <div className="rounded-2xl bg-white/20 border border-white/10 p-6">
              <div className="grid grid-cols-2 gap-4">
                {container.currentProducts.map((product, index) => {
                  const isSelected = container.isProductSelected(product.id)
                  const originalData = container.currentProductResponses[index]
                  const originalPrice = originalData?.originalPrice
                  const salePrice = originalData?.salePrice || product.price
                  const discountRate = originalData?.discountRate || originalData?.discount
                  const commissionRate = originalData?.commissionRate
                  const currency = originalData?.currency || 'KRW'

                  // 할인율 계산
                  let calculatedDiscount: string | undefined
                  if (originalPrice && salePrice && originalPrice > salePrice) {
                    const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                    calculatedDiscount = `${discountPercent}%`
                  }
                  const displayDiscount = discountRate || calculatedDiscount

                  // 예상 수익 계산
                  let expectedRevenue: number | null = null
                  if (salePrice && commissionRate) {
                    const rateStr = String(commissionRate).replace(/%/g, '').trim()
                    const rateNum = parseFloat(rateStr)
                    if (!isNaN(rateNum)) {
                      expectedRevenue = salePrice * (rateNum / 100)
                    }
                  }

                  return (
                    <div
                      key={product.id}
                      className="rounded-2xl bg-white p-4 cursor-pointer hover:shadow-lg transition-all"
                    >
                      <div className="flex gap-4">
                        <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#a6a6a6]">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name || '제품 이미지'}
                              width={96}
                              height={96}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingCart className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[var(--font-size-16)] font-medium text-[#111111] mb-2 line-clamp-2 tracking-[-0.32px] leading-[var(--line-height-16-140)]">
                            {product.name || '제품명 없음'}
                          </h3>
                          <div className="mb-2">
                            {originalPrice && salePrice && originalPrice > salePrice ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[14px] font-medium text-[#a6a6a6] line-through tracking-[-0.14px] leading-[19.6px]">
                                  {originalPrice.toLocaleString()} {currency}
                                </span>
                                <span className="text-[var(--font-size-24)] font-bold text-[#111111] tracking-[-0.48px] leading-[var(--line-height-24-140)]">
                                  {salePrice.toLocaleString()} {currency}
                                </span>
                                {displayDiscount && (
                                  <span className="px-2 py-1 rounded bg-[#dc2626] text-white text-[14px] font-bold tracking-[-0.14px] leading-[22.4px]">
                                    {displayDiscount} 할인
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--font-size-24)] font-bold text-[#111111] tracking-[-0.48px] leading-[var(--line-height-24-140)]">
                                {salePrice ? `${salePrice.toLocaleString()} ${currency}` : '가격 정보 없음'}
                              </span>
                            )}
                          </div>
                          {commissionRate && (
                            <p className="text-[var(--font-size-14)] font-bold text-[#5e8790] mb-2 tracking-[-0.14px] leading-[var(--line-height-14-140)]">
                              수수료율: {commissionRate}
                            </p>
                          )}
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[var(--font-size-16)] font-bold text-[#234b60] hover:underline tracking-[-0.32px] leading-[var(--line-height-16-140)]"
                            >
                              상품 보기
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          {expectedRevenue !== null && (
                            <div className="mt-3 pt-3 border-t border-[#a6a6a6]">
                              <div className="flex items-end justify-end gap-2">
                                <span className="text-[12px] font-medium text-[#111111] leading-[16.8px]">예상 수익</span>
                                <span className="text-[var(--font-size-20)] font-bold text-[#111111] tracking-[-0.4px] leading-[var(--line-height-20-140)]">
                                  {Math.round(expectedRevenue).toLocaleString()} {currency}
                                </span>
                              </div>
                              <p className="text-[12px] font-medium text-[#5d5d5d] text-right mt-1 leading-[16.8px]">
                                * 수익 기준은 실제 금액 기준이라 예상 수익과 다를 수 있습니다
                              </p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => container.handleProductToggle(product)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-[var(--font-size-12)] font-bold transition-colors leading-[var(--line-height-12-140)] ${
                            isSelected
                              ? 'bg-[#e4eeed] text-[#111111]'
                              : 'bg-[#e4eeed] text-[#111111] hover:bg-[#d4e0df]'
                          }`}
                        >
                          선택
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 에러 메시지 표시 */}
        {container.searchError && !container.isSearching && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-base">{container.searchError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
