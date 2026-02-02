'use client'

import { memo } from 'react'

interface SearchUrlToggleProps {
  searchMode: 'search' | 'url'
  onModeChange: (mode: 'search' | 'url') => void
}

export const SearchUrlToggle = memo(function SearchUrlToggle({
  searchMode,
  onModeChange,
}: SearchUrlToggleProps) {
  return (
    <div className="flex rounded-[64px] bg-[#d6d6d6] p-2" style={{ width: '182px', height: '68px' }}>
      <button
        onClick={() => onModeChange('search')}
        className={`flex-1 rounded-[60px] text-[var(--font-size-20)] font-bold transition-all tracking-[-0.4px] leading-[28px] ${
          searchMode === 'search'
            ? 'bg-white text-[#15252c]'
            : 'bg-transparent text-[#2c2c2c]'
        }`}
      >
        상품 검색
      </button>
      <button
        onClick={() => onModeChange('url')}
        className={`flex-1 rounded-[60px] text-[var(--font-size-20)] font-bold transition-all tracking-[-0.4px] leading-[28px] ${
          searchMode === 'url'
            ? 'bg-white text-[#15252c]'
            : 'bg-transparent text-[#2c2c2c]'
        }`}
      >
        URL
      </button>
    </div>
  )
})
