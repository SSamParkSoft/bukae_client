'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

export const LoadingIndicator = memo(function LoadingIndicator() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[60vh] w-full max-w-[1194px] mx-auto mt-24">
      {/* 배경 이미지 - 좌우반전 + 상하반전 애니메이션 */}
      <motion.div
        animate={{
          scaleX: [1, -1, -1, 1, 1],
          scaleY: [1, 1, -1, -1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 flex items-center justify-center opacity-50"
      >
        <Image
          src="/loading.svg"
          alt="로딩 배경"
          width={858}
          height={429}
          className="w-full max-w-[858px] h-auto"
        />
      </motion.div>

      {/* 로딩 스피너와 텍스트 - 배경 위에 표시 */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 w-full max-w-[1194px]">
        {/* 텍스트 영역 */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#5e8790]" />
            <span 
              className="font-bold text-[#15252c] tracking-[-0.64px]"
              style={{ 
                fontSize: 'var(--font-size-32)',
                lineHeight: 'var(--line-height-32-140)'
              }}
            >
              BUKAE AI가 아이템을 분석중이에요
            </span>
          </div>
          <div className="w-full h-px bg-blue-200 opacity-50" style={{ maxWidth: '200px' }} />
          <span 
            className="font-bold text-[#15252c] tracking-[-0.64px]"
            style={{ 
              fontSize: 'var(--font-size-32)',
              lineHeight: 'var(--line-height-32-140)'
            }}
          >
            잠시만 기다려주세요
          </span>
        </div>
      </div>
    </div>
  )
})
