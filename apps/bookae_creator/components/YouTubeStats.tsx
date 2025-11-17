'use client'

import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Users,
  BarChart3,
  Loader2,
  Youtube,
} from 'lucide-react'
import { useYouTubeStats } from '@/lib/hooks/useYouTubeStats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/store/useThemeStore'

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

export default function YouTubeStats() {
  const { data, isLoading, error } = useYouTubeStats()
  const theme = useThemeStore((state) => state.theme)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
        <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          데이터를 불러오는 중...
        </span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    )
  }

  if (!data) {
    return null
  }

  // 수익 관련 통계 (우선 표시 - 강조)
  const revenueStats = [
    {
      name: '총 예상 수익',
      value: formatCurrency(data.totalEstimatedRevenue),
      icon: DollarSign,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50',
      isHighlight: true,
    },
    {
      name: '광고 수익',
      value: formatCurrency(data.adRevenue),
      icon: TrendingUp,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50',
      isHighlight: true,
    },
    {
      name: 'CPM',
      value: `₩${data.cpm.toFixed(2)}`,
      icon: BarChart3,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50',
      isHighlight: true,
    },
    {
      name: '수익화된 재생수',
      value: formatNumber(data.monetizedPlaybacks),
      icon: Youtube,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/40' : 'bg-purple-50',
      isHighlight: true,
    },
  ]

  // 기타 통계
  const otherStats = [
    {
      name: '동영상 조회수',
      value: formatNumber(data.views),
      icon: Eye,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50',
    },
    {
      name: '좋아요수',
      value: formatNumber(data.likes),
      icon: ThumbsUp,
      color: theme === 'dark' ? 'text-purple-300' : 'text-purple-600',
      bgColor: theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50',
    },
    {
      name: '싫어요수',
      value: formatNumber(data.dislikes),
      icon: ThumbsDown,
      color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
      bgColor: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
    },
    {
      name: '구독자 증감',
      value: data.subscriberChange >= 0 ? `+${formatNumber(data.subscriberChange)}` : formatNumber(data.subscriberChange),
      icon: Users,
      color: data.subscriberChange >= 0 
        ? (theme === 'dark' ? 'text-purple-300' : 'text-purple-600')
        : (theme === 'dark' ? 'text-red-400' : 'text-red-600'),
      bgColor: data.subscriberChange >= 0 
        ? (theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-50')
        : (theme === 'dark' ? 'bg-red-900/30' : 'bg-red-50'),
    },
  ]

  return (
    <div className="space-y-6">
      {/* 수익 관련 통계 - 강조 표시 */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          수익 통계
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {revenueStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  className={`h-full ${stat.isHighlight ? 'border-2' : 'border'} border-gray-200 ${
                    stat.isHighlight
                      ? theme === 'dark'
                        ? 'shadow-lg shadow-purple-900/20'
                        : 'shadow-md'
                      : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                    <CardTitle className={`mt-4 ${stat.isHighlight ? 'text-3xl' : 'text-2xl'} font-bold ${stat.color}`}>
                      {stat.value}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 기타 통계 */}
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          기타 통계
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {otherStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: (revenueStats.length + index) * 0.1 }}
              >
                <Card className="h-full border border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-bold mt-4">{stat.value}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 트래픽 유입경로 */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>트래픽 유입경로</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.trafficSources.map((source, index) => (
              <div key={source.source} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {source.source}
                  </span>
                  <span className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {source.percentage}%
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${source.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`h-2 rounded-full ${
                      theme === 'dark' ? 'bg-purple-500' : 'bg-purple-600'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

