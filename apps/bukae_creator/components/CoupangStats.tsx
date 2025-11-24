'use client'

import { motion } from 'framer-motion'
import { Eye, ShoppingCart, XCircle, DollarSign, Loader2 } from 'lucide-react'
import { useCoupangStats } from '@/lib/hooks/useCoupangStats'
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

export default function CoupangStats() {
  const { data, isLoading, error } = useCoupangStats()
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

  // 최근 7일 합계 계산
  const totalViews = data.dailyViews.reduce((sum, item) => sum + item.click, 0)
  const totalOrders = data.dailyOrders.length
  const totalOrderAmount = data.dailyOrders.reduce((sum, item) => sum + item.gmv, 0)
  const totalCancellations = data.dailyCancellations.length
  const totalCancellationAmount = data.dailyCancellations.reduce(
    (sum, item) => sum + item.gmv,
    0
  )
  const totalRevenue = data.dailyRevenue.reduce((sum, item) => sum + item.commission, 0)

  const stats = [
    {
      name: '일별 조회수',
      value: formatNumber(totalViews),
      description: '최근 7일 합계',
      icon: Eye,
      color: 'purple',
      detail: data.dailyViews,
    },
    {
      name: '일별 주문 정보',
      value: totalOrders.toString(),
      description: `총 주문액: ${formatCurrency(totalOrderAmount)}`,
      icon: ShoppingCart,
      color: 'purple',
      detail: data.dailyOrders,
    },
    {
      name: '일별 취소 정보',
      value: totalCancellations.toString(),
      description: `취소액: ${formatCurrency(totalCancellationAmount)}`,
      icon: XCircle,
      color: 'purple',
      detail: data.dailyCancellations,
    },
    {
      name: '일별 수익 정보',
      value: formatCurrency(totalRevenue),
      description: '최근 7일 합계',
      icon: DollarSign,
      color: 'purple',
      detail: data.dailyRevenue,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            purple: theme === 'dark' 
              ? 'bg-purple-900/40 text-purple-300' 
              : 'bg-purple-50 text-purple-600',
          }

          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="h-full border border-gray-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold mt-4">{stat.value}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                </CardHeader>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* 일별 상세 정보 테이블 */}
      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle>최근 7일 상세 통계</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-2">날짜</th>
                  <th className="text-right p-2">조회수</th>
                  <th className="text-right p-2">주문수</th>
                  <th className="text-right p-2">주문액</th>
                  <th className="text-right p-2">취소수</th>
                  <th className="text-right p-2">취소액</th>
                  <th className="text-right p-2">수익</th>
                </tr>
              </thead>
              <tbody>
                {data.dailyRevenue.map((revenue) => {
                  // 같은 날짜의 데이터 찾기
                  const view = data.dailyViews.find((v) => v.date === revenue.date)
                  const orders = data.dailyOrders.filter((o) => o.date === revenue.date)
                  const cancellations = data.dailyCancellations.filter((c) => c.date === revenue.date)
                  
                  // 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
                  const formattedDate = revenue.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
                  
                  return (
                    <tr 
                      key={revenue.date} 
                      className={`border-b transition-colors ${
                        theme === 'dark' 
                          ? 'hover:bg-purple-900/20 border-gray-200/40' 
                          : 'hover:bg-purple-50 border-gray-200'
                      }`}
                    >
                      <td className="p-2">{new Date(formattedDate).toLocaleDateString('ko-KR')}</td>
                      <td className="text-right p-2">{formatNumber(view?.click || 0)}</td>
                      <td className="text-right p-2">{orders.length}</td>
                      <td className="text-right p-2">
                        {formatCurrency(orders.reduce((sum, o) => sum + o.gmv, 0))}
                      </td>
                      <td className="text-right p-2">{cancellations.length}</td>
                      <td className="text-right p-2">
                        {formatCurrency(cancellations.reduce((sum, c) => sum + c.gmv, 0))}
                      </td>
                      <td className={`text-right p-2 font-semibold ${
                        theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                      }`}>
                        {formatCurrency(revenue.commission)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

