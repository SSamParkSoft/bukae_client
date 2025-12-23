'use client'

import { ReactNode } from 'react'
import { AlertTriangle, Hammer, Sparkles } from 'lucide-react'
import { useThemeStore } from '@/store/useThemeStore'

interface ConstructionPlaceholderProps {
  title?: string
  description?: string
  items?: string[]
  children?: ReactNode
  className?: string
}

export default function ConstructionPlaceholder({
  title = '준비중입니다',
  description = '첫 출시 버전에서는 숨겨두었어요. 멋진 기능을 위해 공사 중입니다.',
  items = [],
  children,
  className = '',
}: ConstructionPlaceholderProps) {
  const theme = useThemeStore((state) => state.theme)
  const isDark = theme === 'dark'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed ${
        className || ''
      }`}
    >
      {/* 배경 패턴 */}
      <div
        className="absolute inset-0 opacity-60 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(250, 204, 21, 0.08) 0px, rgba(250, 204, 21, 0.08) 16px, rgba(17, 24, 39, 0.05) 16px, rgba(17, 24, 39, 0.05) 32px)',
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-3 opacity-90"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #facc15 0px, #facc15 12px, #111827 12px, #111827 24px)',
        }}
      />

      <div
        className={`relative z-10 p-8 lg:p-10 backdrop-blur ${
          isDark
            ? 'bg-gray-900/85 border-gray-700 text-gray-50'
            : 'bg-white/95 border-yellow-200 text-gray-900'
        }`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-400 text-gray-900 shadow-md">
              <Hammer className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold shadow ${
                isDark ? 'bg-gray-900 text-white' : 'bg-gray-900 text-white'
              }`}>
                <AlertTriangle className="w-4 h-4 text-yellow-300" />
                공사중
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${
                  isDark ? 'text-gray-300' : 'text-gray-800'
                }`}>
                  {description}
                </p>
              </div>
            </div>
          </div>
          {items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full lg:max-w-md">
              {items.map((item) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm ${
                    isDark
                      ? 'bg-gray-800/80 border-gray-700 text-gray-100'
                      : 'bg-yellow-50/90 border-yellow-200 text-gray-800'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <span className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {children && (
          <div className="mt-8">
            <div className="grid grid-cols-1 gap-4 lg:gap-6">
              {children}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


