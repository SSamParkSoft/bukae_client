'use client'

import Image from 'next/image'
import { Loader2, AlertCircle, Send, ShoppingCart, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import StepIndicator from '@/components/StepIndicator'
import SelectedProductsPanel from '@/components/SelectedProductsPanel'
import { useStep1Container } from './hooks/useStep1Container'
import type { TargetMall } from '@/lib/types/products'

export default function Step1Page() {
  const container = useStep1Container()

  // 토큰 검증 중에는 로딩 표시
  if (container.isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className={container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>인증 확인 중...</p>
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
                container.theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              상품 선택
            </h1>
            <p
              className={`mb-8 ${
                container.theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              AI에게 원하는 상품을 물어보세요
            </p>

            {/* 플랫폼 선택 카드 */}
            <div
              className={`mb-6 rounded-lg shadow-sm border p-6 ${
                container.theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <h2
                className={`text-lg font-semibold mb-4 ${
                  container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                플랫폼 선택
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => container.handlePlatformSelect('all')}
                  disabled
                  className={`p-4 rounded-lg border-2 transition-all ${
                    container.selectedPlatform === 'all'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : container.theme === 'dark'
                        ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div
                    className={`font-medium ${
                      container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    전체
                  </div>
                  <div className="text-xs text-gray-400 mt-1">준비 중</div>
                </button>
                {(Object.keys(container.platformInfo) as TargetMall[]).map((platform) => {
                  const info = container.platformInfo[platform]
                  return (
                    <button
                      key={platform}
                      onClick={() => container.handlePlatformSelect(platform)}
                      disabled={!info.enabled}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        container.selectedPlatform === platform
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : info.enabled
                            ? container.theme === 'dark'
                              ? 'border-gray-700 bg-gray-900 hover:border-purple-600'
                              : 'border-gray-200 bg-white hover:border-purple-300'
                            : container.theme === 'dark'
                              ? 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div
                        className={`font-medium ${
                          container.selectedPlatform === platform
                            ? 'text-purple-600 dark:text-purple-400'
                            : container.theme === 'dark'
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
                container.theme === 'dark'
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="예) 화장실에서 심심할 때 좋은 거, 캠핑 가서 먹기 좋은 밀키트, 여친한테 사랑받는 선물"
                  value={container.prompt}
                  onChange={(e) => container.setPrompt(e.target.value)}
                  onKeyPress={container.handleKeyPress}
                  disabled={container.isSearching || container.selectedPlatform === 'all'}
                  className={`w-full pl-4 pr-12 py-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg ${
                    container.theme === 'dark'
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${container.isSearching || container.selectedPlatform === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                  onClick={container.handleSearch}
                  disabled={container.isSearching || !container.prompt.trim() || container.selectedPlatform === 'all'}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                    container.isSearching || !container.prompt.trim() || container.selectedPlatform === 'all'
                      ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                      : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                >
                  {container.isSearching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <Send className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <p className={`mt-2 text-sm ${
                container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 복잡한 검색어 고민 NO! 평소 말하는 것처럼 자연스럽게 적어주세요.
              </p>
              <p className={`mt-2 text-sm ${
                container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                💡 AI가 문맥을 파악해 지금 가장 잘 팔리는 &quot;인기 상품&quot;을 추천해 드릴게요.
              </p>
              {container.searchError && (
                <div className="mt-4 flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{container.searchError}</span>
                </div>
              )}
            </div>

            {/* 검색 결과 영역 */}
            {container.isSearching && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  container.theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                  <span className={`text-lg ${
                    container.theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    AI가 상품을 분석 중입니다...
                  </span>
                </div>
              </div>
            )}

            {/* 검색 결과 표시 */}
            {container.currentProducts.length > 0 && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  container.theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                {container.selectedPlatform === 'COUPANG' && (
                  <div className={`mb-4 p-3 rounded-lg border ${
                    container.theme === 'dark'
                      ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300'
                      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  }`}>
                    <p className="text-sm">
                      ⚠️ 쿠팡 상품의 이미지를 가져오려면 크롤러 확장 프로그램 설치가 필요해요.
                    </p>
                  </div>
                )}
                <h2
                  className={`text-xl font-bold mb-6 ${
                    container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {container.currentProducts.length}개를 찾았습니다!{' '}
                  <span className={`ml-2 text-sm font-normal ${
                    container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    정확한 가격은 링크에서 확인해주세요!
                  </span>
                </h2>
                <div className="space-y-4">
                  {container.currentProducts.map((product, index) => {
                    const isSelected = container.isProductSelected(product.id)
                    const originalData = container.currentProductResponses[index]
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
                        onClick={() => container.handleProductToggle(product)}
                        className={`flex gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? container.theme === 'dark'
                              ? 'border-purple-500 bg-purple-900/20'
                              : 'border-purple-500 bg-purple-50'
                            : container.theme === 'dark'
                              ? 'border-gray-600 bg-gray-800'
                              : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className={`w-24 h-24 shrink-0 rounded-lg flex items-center justify-center overflow-hidden ${
                          container.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
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
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className={`font-semibold text-base mb-2 line-clamp-2 ${
                              container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {product.name || '제품명 없음'}
                            </h4>
                            
                            {/* 가격 정보 */}
                            <div className="mb-2 space-y-1">
                              {originalPrice && salePrice ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {originalPrice > salePrice && (
                                    <span className={`text-sm line-through ${
                                      container.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                                    }`}>
                                      {originalPrice.toLocaleString()} {currency}
                                    </span>
                                  )}
                                  <span className={`text-lg font-bold ${
                                    container.theme === 'dark' ? 'text-white' : 'text-gray-900'
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
                                  container.theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {salePrice.toLocaleString()} {currency}
                                </p>
                              ) : (
                                <p className={`text-lg font-bold ${
                                  container.theme === 'dark' ? 'text-white' : 'text-gray-400'
                                }`}>
                                  약 {product.price ? product.price.toLocaleString() : '0'}원
                                </p>
                              )}
                              
                              {/* 수수료 표시 */}
                              {commissionRate && (
                                <p className={`text-xs ${
                                  container.theme === 'dark' ? 'text-green-400' : 'text-green-600'
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
                                  container.theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
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
                                    container.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    예상 수익
                                  </span>
                                  <span className={`text-lg font-bold ${
                                    container.theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'
                                  }`}>
                                    {Math.round(expectedRevenue).toLocaleString()} {currency}
                                  </span>
                                </div>
                                <p className={`text-xs ${
                                  container.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
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
            {container.searchError && !container.isSearching && (
              <div
                className={`mb-6 rounded-lg shadow-sm border p-6 ${
                  container.theme === 'dark'
                    ? 'bg-red-900/20 border-red-700'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-base">{container.searchError}</span>
                </div>
              </div>
            )}

          </div>
        </div>
        <div className="hidden lg:block shrink-0">
          <div className="sticky top-4 p-4 md:p-8 flex flex-col gap-6 w-80 xl:w-96" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <SelectedProductsPanel 
              productResponses={container.currentProductResponses}
              currentProducts={container.currentProducts}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
