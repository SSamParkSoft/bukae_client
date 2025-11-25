'use client'

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCoupangStats } from '@/lib/hooks/useCoupangStats'
import { useYouTubeVideos } from '@/lib/hooks/useYouTubeVideos'
import { useYouTubeStats } from '@/lib/hooks/useYouTubeStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useThemeStore } from '@/store/useThemeStore'
import { TrendingUp, ShoppingCart, Eye, Loader2, Youtube, Users, Store, DollarSign, Video, ArrowRight } from 'lucide-react'
import HomeShortcut from '@/components/HomeShortcut'
import PageHeader from '@/components/PageHeader'

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(num)
}

export default function HomePage() {
  const router = useRouter()
  const { data: coupangData, isLoading: coupangLoading } = useCoupangStats()
  const { data: youtubeVideos, isLoading: youtubeLoading } = useYouTubeVideos()
  const { data: youtubeStats, isLoading: youtubeStatsLoading } = useYouTubeStats()
  const theme = useThemeStore((state) => state.theme)
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false)

  // 금주의 핫 키워드 (카테고리별 주문 수 집계)
  const hotKeywords = useMemo(() => {
    if (!coupangData?.dailyOrders) return []
    
    const categoryCount: Record<string, number> = {}
    coupangData.dailyOrders.forEach((order) => {
      const category = order.categoryName
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })

    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [coupangData])

  // 가장 많이 팔린 상품 TOP 5
  const topProducts = useMemo(() => {
    if (!coupangData?.dailyOrders) return []
    
    const productMap: Record<string, { name: string; orderCount: number; totalGmv: number; totalCommission: number; thumbnailUrl?: string }> = {}
    
    coupangData.dailyOrders.forEach((order) => {
      const productName = order.productName
      if (!productMap[productName]) {
        productMap[productName] = {
          name: productName,
          orderCount: 0,
          totalGmv: 0,
          totalCommission: 0,
          thumbnailUrl: order.thumbnailUrl,
        }
      }
      productMap[productName].orderCount += 1
      productMap[productName].totalGmv += order.gmv
      productMap[productName].totalCommission += order.commission
      // 썸네일이 없으면 첫 번째 주문의 썸네일 사용
      if (!productMap[productName].thumbnailUrl && order.thumbnailUrl) {
        productMap[productName].thumbnailUrl = order.thumbnailUrl
      }
    })

    return Object.values(productMap)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 5)
  }, [coupangData])

  // 가장 높은 조회수를 가진 영상 TOP 5
  const topVideos = useMemo(() => {
    if (!youtubeVideos) return []
    
    return [...youtubeVideos]
      .filter((video) => video.views !== undefined)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
  }, [youtubeVideos])

  // 통계 요약 계산
  const summaryStats = useMemo(() => {
    const coupangRevenue = coupangData?.dailyRevenue.reduce((sum, item) => sum + item.commission, 0) || 0
    const coupangOrders = coupangData?.dailyOrders.length || 0
    const coupangViews = coupangData?.dailyViews.reduce((sum, item) => sum + item.click, 0) || 0
    const youtubeRevenue = youtubeStats?.totalEstimatedRevenue || 0
    const youtubeViews = youtubeStats?.views || 0
    const totalRevenue = coupangRevenue + youtubeRevenue

    return {
      totalRevenue,
      coupangRevenue,
      coupangOrders,
      coupangViews,
      youtubeRevenue,
      youtubeViews,
    }
  }, [coupangData, youtubeStats])

  const isLoading = coupangLoading || youtubeLoading || youtubeStatsLoading

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 헤더 */}
        <PageHeader
          title=""
        >
          <div className="mb-1">
            <div className="flex items-center mb-2">
              <img 
                src="/logo-icon.svg" 
                alt="부캐 아이콘" 
                className="w-10 h-10"
              />
              <img 
                src="/logo-typography.svg" 
                alt="부캐 타이포" 
                className="h-10 w-auto -ml-8"
              />
            </div>
            <p className={`${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              금주의 인기 키워드와 성과를 확인하세요
            </p>
          </div>
        </PageHeader>

        {/* 내 홈페이지 바로가기 */}
        <HomeShortcut />

        {/* 통계 요약 및 영상 만들러가기 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
            <span className={`ml-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              데이터를 불러오는 중...
            </span>
          </div>
        ) : (
          <>
            {/* 통계 요약 섹션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className={`h-full border-2 border-gray-200 ${
                  theme === 'dark' 
                    ? 'bg-purple-900/20' 
                    : 'bg-purple-50/50'
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                      }`}>
                        <DollarSign className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </div>
                    </div>
                    <CardTitle className={`text-2xl font-bold mt-4 ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {formatCurrency(summaryStats.totalRevenue)}
                    </CardTitle>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      총 수익
                    </p>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <Card className="h-full border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                      }`}>
                        <ShoppingCart className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </div>
                    </div>
                    <CardTitle className={`text-2xl font-bold mt-4 ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {formatCurrency(summaryStats.coupangRevenue)}
                    </CardTitle>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      쿠팡 수익
                    </p>
                    <p className={`text-xs mt-1 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      주문 {summaryStats.coupangOrders}건
                    </p>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card className="h-full border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                      }`}>
                        <Youtube className={`w-6 h-6 ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`} />
                      </div>
                    </div>
                    <CardTitle className={`text-2xl font-bold mt-4 ${
                      theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                    }`}>
                      {formatCurrency(summaryStats.youtubeRevenue)}
                    </CardTitle>
                    <p className={`text-sm mt-1 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      유튜브 수익
                    </p>
                    <p className={`text-xs mt-1 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      조회수 {formatNumber(summaryStats.youtubeViews)}
                    </p>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="h-full"
              >
                <div
                  className={`h-full rounded-lg p-[2px] cursor-pointer transition-all shadow-sm hover:shadow-md hover:scale-90 animate-purple-glow ${
                    theme === 'dark' 
                      ? 'bg-gradient-to-br from-purple-600/80 to-purple-400/20 hover:from-purple-400/70 hover:to-purple-500/70' 
                      : 'bg-gradient-to-br from-purple-200/20 to-purple-400/80 hover:from-purple-200/70 hover:to-purple-300/70'
                  }`}
                  onClick={() => router.push('/video/create')}
                >
                  <Card 
                    className={`h-full border-0 cursor-pointer transition-all rounded-lg ${
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-purple-500/70 to-purple-300/10 hover:from-purple-400/60 hover:to-purple-500/60' 
                        : 'bg-gradient-to-br from-purple-300/10 to-purple-400/70 hover:from-purple-200/60 hover:to-purple-300/60'
                    }`}
                  >
                    <CardHeader className="h-full flex flex-col justify-center">
                      <div className="flex flex-col items-center gap-5">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
                          theme === 'dark' 
                            ? 'bg-white/30 backdrop-blur-sm' 
                            : 'bg-white/40 backdrop-blur-sm'
                        }`}>
                          <Video className={`w-10 h-10 ${
                            theme === 'dark' ? 'text-purple-900' : 'text-purple-700'
                          }`} />
                        </div>
                        <div className="text-center">
                          <CardTitle className={`text-2xl font-bold mb-3 text-white/90 ${
                            theme === 'dark' ? 'text-white/90' : 'text-gray-900'
                          }`}>
                            영상 제작하기
                          </CardTitle>
                          <div className={`flex items-center justify-center gap-2 text-base font-semibold ${
                            theme === 'dark' ? 'text-white/90' : 'text-gray-900'
                          }`}>
                            <span>바로 시작</span>
                            <ArrowRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </div>
              </motion.div>
            </div>

            {/* 기존 섹션들 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 금주의 핫 키워드 */}
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <CardTitle>금주의 핫 키워드</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {hotKeywords.length > 0 ? (
                  <div className="space-y-4">
                    {hotKeywords.map((keyword, index) => (
                      <motion.div
                        key={keyword.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          theme === 'dark' 
                            ? 'border-gray-200/40 hover:bg-purple-900/20' 
                            : 'border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0
                              ? theme === 'dark'
                                ? 'bg-purple-600 text-purple-100'
                                : 'bg-purple-600 text-white'
                              : index === 1
                              ? theme === 'dark'
                                ? 'bg-purple-700/60 text-purple-200'
                                : 'bg-purple-500 text-white'
                              : index === 2
                              ? theme === 'dark'
                                ? 'bg-purple-800/50 text-purple-300'
                                : 'bg-purple-400 text-white'
                              : theme === 'dark'
                                ? 'bg-purple-900/40 text-purple-400'
                                : 'bg-purple-100 text-purple-700'
                          }`}>
                            {index + 1}
                          </div>
                          <span className={`font-medium ${
                            theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                          }`}>
                            {keyword.name}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        }`}>
                          {keyword.count}건
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    데이터가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 가장 많이 팔린 상품 TOP 5 */}
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <CardTitle>가장 많이 팔린 상품</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <motion.div
                        key={product.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`p-3 rounded-lg border transition-colors ${
                          theme === 'dark' 
                            ? 'border-gray-200/40 hover:bg-purple-900/20' 
                            : 'border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            {/* 썸네일 이미지 */}
                            <div className="relative shrink-0">
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                {product.thumbnailUrl ? (
                                  <img
                                    src={product.thumbnailUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // 이미지 로드 실패 시 기본 아이콘 표시
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const fallback = target.parentElement?.querySelector('.thumbnail-fallback') as HTMLElement
                                      if (fallback) {
                                        fallback.style.display = 'flex'
                                      }
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className={`w-full h-full rounded-lg flex items-center justify-center thumbnail-fallback ${
                                    product.thumbnailUrl ? 'hidden' : 'flex'
                                  } ${
                                    theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-100'
                                  }`}
                                >
                                  <ShoppingCart className={`w-6 h-6 ${
                                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                  }`} />
                                </div>
                              </div>
                              {/* 순위 배지 */}
                              <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${
                                index === 0
                                  ? theme === 'dark'
                                    ? 'bg-purple-600 text-purple-100'
                                    : 'bg-purple-600 text-white'
                                  : index === 1
                                  ? theme === 'dark'
                                    ? 'bg-purple-700/80 text-purple-200'
                                    : 'bg-purple-500 text-white'
                                  : index === 2
                                  ? theme === 'dark'
                                    ? 'bg-purple-800/70 text-purple-300'
                                    : 'bg-purple-400 text-white'
                                  : theme === 'dark'
                                    ? 'bg-purple-900/60 text-purple-400'
                                    : 'bg-purple-300 text-purple-900'
                              }`}>
                                {index + 1}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${
                                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                              }`}>
                                {product.name}
                              </p>
                              <p className={`text-xs mt-1 ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                주문 {product.orderCount}건
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className={`flex items-center justify-between mt-2 pt-2 border-t ${
                          theme === 'dark' ? 'border-gray-200/40' : 'border-gray-200'
                        }`}>
                          <div>
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              총 판매액
                            </p>
                            <p className={`text-sm font-semibold ${
                              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {formatCurrency(product.totalGmv)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              수익
                            </p>
                            <p className={`text-sm font-semibold ${
                              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                            }`}>
                              {formatCurrency(product.totalCommission)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    데이터가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 가장 높은 조회수를 가진 영상 TOP 5 */}
            <Card className="lg:col-span-2 border border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Youtube className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <CardTitle>가장 높은 조회수를 가진 영상</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {topVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {topVideos.map((video, index) => (
                      <motion.div
                        key={video.videoId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="group cursor-pointer"
                      >
                        <div className={`relative aspect-video rounded-lg overflow-hidden mb-2 ${
                          theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50'
                        }`}>
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Youtube className={`w-12 h-12 ${
                                theme === 'dark' ? 'text-purple-500' : 'text-purple-400'
                              }`} />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              index === 0
                                ? theme === 'dark'
                                  ? 'bg-purple-600 text-purple-100'
                                  : 'bg-purple-600 text-white'
                                : index === 1
                                ? theme === 'dark'
                                  ? 'bg-purple-700/80 text-purple-200'
                                  : 'bg-purple-500 text-white'
                                : index === 2
                                ? theme === 'dark'
                                  ? 'bg-purple-800/70 text-purple-300'
                                  : 'bg-purple-400 text-white'
                                : theme === 'dark'
                                  ? 'bg-purple-900/60 text-purple-400'
                                  : 'bg-purple-300 text-purple-900'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className={`w-4 h-4 ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`} />
                          <span className={`text-sm font-semibold ${
                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                          }`}>
                            {formatNumber(video.views || 0)}
                          </span>
                        </div>
                        <p className={`text-sm font-medium line-clamp-2 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {video.title}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    데이터가 없습니다
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 다른 회원들이 만든 상품 보러가기 */}
            <Card 
              className="lg:col-span-2 cursor-pointer transition-all hover:shadow-lg border border-gray-200"
              onClick={() => setIsComingSoonOpen(true)}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Store className={`w-5 h-5 ${
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  }`} />
                  <CardTitle>다른 회원들이 만든 상품 보러가기</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-8 rounded-lg border-2 border-dashed border-gray-200 text-center ${
                    theme === 'dark' 
                      ? 'bg-purple-900/10 hover:bg-purple-900/20' 
                      : 'bg-purple-50/50 hover:bg-purple-50'
                  } transition-colors`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      theme === 'dark' 
                        ? 'bg-purple-900/40' 
                        : 'bg-purple-100'
                    }`}>
                      <Users className={`w-8 h-8 ${
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <p className={`text-lg font-semibold mb-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                      }`}>
                        다른 회원들의 상품을 둘러보세요
                      </p>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        다양한 상품과 영상을 확인하고 영감을 얻어보세요
                      </p>
                    </div>
                    <div className={`mt-2 px-4 py-2 rounded-lg inline-block ${
                      theme === 'dark' 
                        ? 'bg-purple-600 text-purple-100' 
                        : 'bg-purple-600 text-white'
                    }`}>
                      <span className="text-sm font-medium">보러가기 →</span>
                    </div>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
            </div>
          </>
        )}
      </div>

      {/* 준비중 다이얼로그 */}
      <Dialog open={isComingSoonOpen} onOpenChange={setIsComingSoonOpen}>
        <DialogContent className={`border ${
          theme === 'dark' ? 'bg-gray-900 border-gray-200' : 'bg-white border-gray-200'
        }`}>
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                theme === 'dark' 
                  ? 'bg-purple-900/40' 
                  : 'bg-purple-100'
              }`}>
                <Store className={`w-8 h-8 ${
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                }`} />
              </div>
            </div>
            <DialogTitle className={`text-center text-2xl ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              준비중입니다
            </DialogTitle>
            <DialogDescription className={`text-center mt-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              다른 회원들이 만든 상품을 보는 기능은 현재 준비중입니다.
              <br />
              곧 만나볼 수 있도록 열심히 준비하고 있어요! 🚀
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
