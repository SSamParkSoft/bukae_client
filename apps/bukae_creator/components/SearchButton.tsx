'use client'

import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchButtonProps {
  placeholder?: string
  onClick?: () => void
  disabled?: boolean
  className?: string
  active?: boolean
}

export default function SearchButton({
  placeholder = '알리 익스프레스에서 검색하기',
  onClick,
  disabled = false,
  active = false,
  className,
}: SearchButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full h-[88px] rounded-[60px] gap-4 justify-start px-6',
        active
          ? 'bg-[#5e8790] text-[#d6d6d6] hover:bg-[#5e8790]/90'
          : 'bg-white/80 text-[#2c2c2c] hover:bg-white/90',
        className
      )}
    >
      <Search className="w-10 h-10" />
      <span className="text-lg font-semibold">{placeholder}</span>
    </Button>
  )
}
