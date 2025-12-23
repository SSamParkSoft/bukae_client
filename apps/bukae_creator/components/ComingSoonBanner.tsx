'use client'

import { ReactNode } from 'react'
import { Hourglass } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

interface ComingSoonBannerProps {
  title?: string
  description?: string
  description2?: string
  icon?: ReactNode
}

export default function ComingSoonBanner({
  title = '서비스 준비중입니다.',
  description = '보다 나은 서비스 제공을 위하여 페이지 준비중에 있습니다.',
  description2 = '빠른 시일내에 준비하여 찾아뵙겠습니다.',
  icon,
}: ComingSoonBannerProps) {
  const theme = useThemeStore((state) => state.theme)
  const isDark = theme === 'dark'

  return (
    <div className="mt-10">
      <div
        className={`relative overflow-hidden rounded-3xl border p-14 text-center shadow-xl ${
          isDark ? 'border-gray-800/70' : 'border-gray-100/70'
        }`}
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(14, 18, 28, 0.94) 0%, rgba(7, 11, 20, 0.98) 100%)'
            : 'linear-gradient(180deg, rgba(249, 250, 251, 1) 0%, rgba(243, 246, 250, 1) 100%)',
        }}
      >
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ring-4 shadow-sm ${
            isDark ? 'bg-purple-500/10 ring-purple-500/25' : 'bg-purple-50 ring-purple-100'
          }`}
        >
          {icon ? (
            icon
          ) : (
            <Hourglass className={`h-14 w-14 ${isDark ? 'text-purple-300' : 'text-purple-500'}`} />
          )}
        </div>
        <div className="mt-8 space-y-3">
          <h2 className={`text-3xl font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {title}
          </h2>
          <p className={`text-base ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>{description}</p>
          <p className={`text-base ${isDark ? 'text-gray-200' : 'text-gray-600'}`}>{description2}</p>
        </div>
      </div>
    </div>
  )
}

