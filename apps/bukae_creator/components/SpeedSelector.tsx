'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SpeedOption = '0.50x' | '0.75x' | '1.00x' | '1.25x' | '1.50x' | '2.00x'

interface SpeedSelectorProps {
  value: SpeedOption
  onChange?: (speed: SpeedOption) => void
  className?: string
}

const speedOptions: SpeedOption[] = ['0.50x', '0.75x', '1.00x', '1.25x', '1.50x', '2.00x']

export default function SpeedSelector({
  value,
  onChange,
  className,
}: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn('relative', className)}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className={cn(
          'h-8 px-3 rounded border bg-[#e3e3e3] border-[#d6d6d6] hover:bg-[#e3e3e3] hover:border-[#a6a6a6]',
          isOpen && 'border-[#a6a6a6]'
        )}
      >
        <span className="text-sm font-medium text-[#5d5d5d]">{value}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-2" />
        )}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 bg-white border border-[#a6a6a6] rounded-lg shadow-lg z-20 min-w-[84px]">
            {speedOptions.map((speed) => (
              <button
                key={speed}
                onClick={() => {
                  onChange?.(speed)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm font-medium flex items-center justify-between hover:bg-[#e4eeed]',
                  value === speed && 'bg-[#e4eeed]'
                )}
              >
                <span className="text-[#5d5d5d]">{speed}</span>
                {value === speed && (
                  <Check className="w-4 h-4 text-[#5e8790]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
