'use client'

import { motion } from 'framer-motion'
import PageHeader from '@/components/PageHeader'
import ComingSoonBanner from '@/components/ComingSoonBanner'

export default function StatisticsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-8"
    >
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="통계"
          description="영상 제작 및 성과 통계를 확인하세요"
        />

        <ComingSoonBanner />
      </div>
    </motion.div>
  )
}

