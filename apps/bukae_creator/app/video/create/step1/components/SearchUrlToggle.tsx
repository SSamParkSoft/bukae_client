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
    <div className="mb-8">
      <div className="flex rounded-[60px] bg-bg-gray-light p-2 shadow-[var(--shadow-card-default)] w-full sm:w-[228px] sm:h-[74px]">
        <button
          onClick={() => onModeChange('search')}
          className={`flex-1 rounded-[60px] text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[var(--line-height-24-140)] ${
            searchMode === 'search'
              ? 'bg-white text-text-dark shadow-[var(--shadow-card-default)]'
              : 'bg-transparent text-text-tertiary'
          }`}
        >
          상품 검색
        </button>
        <button
          onClick={() => onModeChange('url')}
          className={`flex-1 rounded-[60px] text-[var(--font-size-24)] font-bold transition-all tracking-[-0.48px] leading-[var(--line-height-24-140)] ${
            searchMode === 'url'
              ? 'bg-white text-text-dark shadow-[var(--shadow-card-default)]'
              : 'bg-transparent text-text-tertiary'
          }`}
        >
          URL
        </button>
      </div>
    </div>
  )
})
