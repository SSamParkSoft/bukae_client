'use client'

import { Search } from 'lucide-react'
import { useState } from 'react'

interface ProductSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export default function ProductSearch({
  onSearch,
  placeholder = '검색어를 입력해주세요.',
}: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchQuery)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    // 실시간 검색 (debounce 없이 즉시)
    onSearch(value)
  }

  return (
    <div className="px-4 py-4 bg-white">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full pl-4 pr-12 py-3 bg-white border border-purple-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-200 text-gray-900 placeholder:text-gray-400"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="검색"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}

