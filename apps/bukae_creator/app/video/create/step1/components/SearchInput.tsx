'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

interface SearchInputProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSearch: () => void
  isSearching: boolean
  disabled: boolean
}

export const SearchInput = memo(function SearchInput({
  placeholder,
  value,
  onChange,
  onKeyPress,
  onSearch,
  isSearching,
  disabled,
}: SearchInputProps) {
  return (
    <div className={isSearching ? "mb-0" : "mb-8"}>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          disabled={disabled}
          className="w-full h-[72px] pl-6 pr-16 rounded-[60px] bg-white/80 font-semibold text-[#2c2c2c] placeholder:text-[#2c2c2c] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed tracking-[-0.36px] shadow-[var(--shadow-card-default)]"
          style={{ 
            fontSize: 'var(--font-size-18)',
            lineHeight: '25.2px'
          }}
        />
        <button
          onClick={onSearch}
          disabled={disabled || !value.trim()}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#2c2c2c]" />
          ) : (
            <Image 
              src="/search.svg" 
              alt="검색" 
              width={24} 
              height={24}
              className="w-6 h-6"
            />
          )}
        </button>
      </div>
    </div>
  )
})
