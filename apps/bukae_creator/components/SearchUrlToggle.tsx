'use client'

import { cn } from '@/lib/utils'

export type SearchUrlMode = 'search' | 'url'

interface SearchUrlToggleProps {
  mode: SearchUrlMode
  onModeChange: (mode: SearchUrlMode) => void
  className?: string
}

export default function SearchUrlToggle({
  mode,
  onModeChange,
  className,
}: SearchUrlToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center bg-white/40 rounded-[60px] p-1 w-fit',
        className
      )}
    >
      <button
        onClick={() => onModeChange('search')}
        className={cn(
          'px-6 py-4 rounded-[60px] text-2xl font-bold transition-all',
          mode === 'search'
            ? 'bg-white text-[#15252c]'
            : 'bg-transparent text-[#5d5d5d]'
        )}
      >
        상품 검색
      </button>
      <button
        onClick={() => onModeChange('url')}
        className={cn(
          'px-6 py-4 rounded-[60px] text-2xl font-bold transition-all',
          mode === 'url'
            ? 'bg-white text-[#15252c]'
            : 'bg-transparent text-[#5d5d5d]'
        )}
      >
        URL
      </button>
    </div>
  )
}
