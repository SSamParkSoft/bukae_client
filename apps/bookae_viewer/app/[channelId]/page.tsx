'use client'

import React, { Suspense } from 'react'
import { use } from 'react'
import PartnershipBanner from '@/components/PartnershipBanner'
import ChannelProfile from '@/components/ChannelProfile'
import TopProducts from '@/components/TopProducts'
import ProductSearch from '@/components/ProductSearch'
import ProductGrid from '@/components/ProductGrid'
import { useChannelInfo } from '@/lib/hooks/useChannelInfo'
import { useChannelStats } from '@/lib/hooks/useChannelStats'
import { useQuery } from '@tanstack/react-query'
import { Product } from '@/lib/types/viewer'
import { Loader2 } from 'lucide-react'

const fetchProducts = async (channelId: string, search: string): Promise<Product[]> => {
  const url = `/api/channels/${channelId}/products${search ? `?search=${encodeURIComponent(search)}` : ''}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('제품 목록을 가져오는데 실패했습니다.')
  }
  return response.json()
}

function ChannelPageContent({ channelId }: { channelId: string }) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const { data: channelInfo, isLoading: channelLoading } = useChannelInfo(channelId)
  const { data: stats, isLoading: statsLoading } = useChannelStats(channelId)
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['channel-products', channelId, searchQuery],
    queryFn: () => fetchProducts(channelId, searchQuery),
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  })

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
      <TopProducts
        topProducts={stats?.topProducts || []}
        isLoading={statsLoading}
        channelName={channelInfo.name}
      />

      {/* 검색 바 */}
      <ProductSearch
        onSearch={setSearchQuery}
        placeholder="검색어를 입력해주세요."
      />

      {/* 제품 그리드 */}
      <ProductGrid products={products || []} isLoading={productsLoading} />

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

