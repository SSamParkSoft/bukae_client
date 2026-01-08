'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FontOption {
  id: string
  name: string
}

interface FontSelectorProps {
  value?: string
  options: FontOption[]
  onChange?: (fontId: string) => void
  className?: string
}

export default function FontSelector({
  value,
  options,
  onChange,
  className,
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedFont = options.find((f) => f.id === value)

  return (
    <div className={cn('relative', className)}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className={cn(
          'h-12 px-4 rounded-lg border bg-white border-[#d6d6d6] hover:bg-[#e4eeed] justify-between w-full',
          isOpen && 'border-[#88a9ac]'
        )}
      >
        <span className="text-base font-medium text-black">
          {selectedFont?.name || '폰트 선택'}
        </span>
        {isOpen ? (
          <ChevronUp className="w-6 h-6" />
        ) : (
          <ChevronDown className="w-6 h-6" />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white/60 border border-[#d6d6d6] rounded-lg shadow-lg z-20 min-w-full max-h-[286px] overflow-y-auto">
            {options.map((font) => (
              <button
                key={font.id}
                onClick={() => {
                  onChange?.(font.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-4 py-3 text-left text-base font-medium flex items-center justify-between hover:bg-[#e4eeed]',
                  value === font.id && 'bg-[#e4eeed]'
                )}
              >
                <span className="text-black">{font.name}</span>
                {value === font.id && (
                  <Check className="w-6 h-6 text-[#5e8790]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
