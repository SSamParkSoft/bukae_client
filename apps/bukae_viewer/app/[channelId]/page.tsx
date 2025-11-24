'use client'

import React, { Suspense } from 'react'
import { use } from 'react'
import PartnershipBanner from '@/components/PartnershipBanner'
import ChannelProfile from '@/components/ChannelProfile'
import TopProducts from '@/components/TopProducts'
import ProductSearch from '@/components/ProductSearch'
import ProductGrid from '@/components/ProductGrid'
import { useChannelInfo } from '@/lib/hooks/useChannelInfo'
import { Loader2 } from 'lucide-react'
import { STATIC_PRODUCTS, STATIC_TOP_PRODUCTS } from '@/lib/data/staticProducts'

function ChannelPageContent({ channelId }: { channelId: string }) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data: channelInfo, isLoading: channelLoading } = useChannelInfo(channelId)

  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_PRODUCTS
    }

    const searchLower = searchQuery.toLowerCase()
    const searchNumber = parseInt(searchQuery, 10)
    const isNumericSearch = !isNaN(searchNumber) && searchQuery.trim() !== ''

    return STATIC_PRODUCTS.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        (isNumericSearch && product.order === searchNumber),
    )
  }, [searchQuery])

  if (channelLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
      </div>
    )
  }

  if (!channelInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">채널을 찾을 수 없습니다</h1>
          <p className="text-gray-600">존재하지 않는 채널 ID입니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 최상단 배너 */}
      <PartnershipBanner />

      {/* 프로필 헤더 */}
      <ChannelProfile channel={channelInfo} />

      {/* Top 5 제품 섹션 */}
      <TopProducts topProducts={STATIC_TOP_PRODUCTS} isLoading={false} channelName={channelInfo.name} />

      {/* 검색 바 */}
      <ProductSearch
        onSearch={setSearchQuery}
        placeholder="검색어를 입력해주세요."
      />

      {/* 제품 그리드 */}
      <ProductGrid products={filteredProducts} isLoading={false} />

      {/* 하단 여백 */}
      <div className="h-8" />
    </div>
  )
}

export default function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { channelId } = use(params)

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 text-purple-300 animate-spin" />
        </div>
      }
    >
      <ChannelPageContent channelId={channelId} />
    </Suspense>
  )
}

