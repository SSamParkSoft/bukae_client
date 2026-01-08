'use client'

import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ScriptInputState = 'default' | 'hover' | 'selected'

interface ScriptInputProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  state?: ScriptInputState
  className?: string
  disabled?: boolean
  onClick?: () => void
  readOnly?: boolean
}

export default function ScriptInput({
  value,
  onChange,
  placeholder,
  state = 'default',
  className,
  disabled = false,
  onClick,
  readOnly = false,
}: ScriptInputProps) {
  return (
    <div 
      className={cn('flex items-center gap-4', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <MessageCircle className="w-6 h-6 text-[#2c2c2c] shrink-0" />
      <div
        className={cn(
          'flex-1 rounded-lg border px-5 py-4 transition-colors',
          state === 'selected'
            ? 'bg-[#88a9ac] border-[#88a9ac]'
            : state === 'hover'
              ? 'bg-[#e4eeed] border-[#88a9ac]'
              : 'bg-transparent border-[#88a9ac]',
          disabled && 'opacity-50 cursor-not-allowed',
          onClick && !disabled && 'cursor-pointer'
        )}
      >
        {readOnly || onClick ? (
          <div
            className={cn(
              'w-full text-xl font-semibold',
              state === 'selected'
                ? 'text-white'
                : 'text-[#2c2c2c]'
            )}
          >
            {value || placeholder}
          </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'w-full bg-transparent outline-none text-xl font-semibold',
              state === 'selected'
                ? 'text-white placeholder:text-white/70'
                : 'text-[#2c2c2c] placeholder:text-[#5d5d5d]'
            )}
          />
        )}
      </div>
    </div>
  )
}
