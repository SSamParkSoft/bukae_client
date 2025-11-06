'use client'

import { BarChart3, Video, Eye, TrendingUp } from 'lucide-react'

const stats = [
  { name: '총 영상 수', value: '24', icon: Video, change: '+12%' },
  { name: '총 조회수', value: '12.4K', icon: Eye, change: '+8%' },
  { name: '평균 조회수', value: '516', icon: BarChart3, change: '+5%' },
  { name: '성장률', value: '23%', icon: TrendingUp, change: '+3%' },
]

export default function StatisticsPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📊 통계</h1>
        <p className="text-gray-600 mb-8">영상 제작 및 성과 통계를 확인하세요</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.name}</div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">최근 영상 통계</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">영상 제목 {item}</div>
                  <div className="text-sm text-gray-500">2024년 1월 {item}일</div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">조회수</div>
                    <div className="font-semibold">{500 + item * 10}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">좋아요</div>
                    <div className="font-semibold">{20 + item * 2}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

