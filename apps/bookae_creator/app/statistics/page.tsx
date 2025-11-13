'use client'

import { motion } from 'framer-motion'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import CoupangStats from '@/components/CoupangStats'
import YouTubeStats from '@/components/YouTubeStats'
import { useThemeStore } from '@/store/useThemeStore'

export default function StatisticsPage() {
  const theme = useThemeStore((state) => state.theme)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto">
        <h1 className={`text-3xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          통계
        </h1>
        <p className={`mb-8 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>
          영상 제작 및 성과 통계를 확인하세요
        </p>

        <Tabs defaultValue="coupang" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="coupang">쿠팡파트너스</TabsTrigger>
            <TabsTrigger value="youtube">유튜브 애널리틱스</TabsTrigger>
          </TabsList>
          <TabsContent value="coupang" className="mt-6">
            <CoupangStats />
          </TabsContent>
          <TabsContent value="youtube" className="mt-6">
            <YouTubeStats />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  )
}

