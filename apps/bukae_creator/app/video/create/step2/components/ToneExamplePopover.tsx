'use client'

import { memo } from 'react'
import { X, MessageSquare } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface ToneExamplePopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  conceptLabel: string
  exampleText: string
}

export const ToneExamplePopover = memo(function ToneExamplePopover({
  isOpen,
  onOpenChange,
  conceptLabel,
  exampleText,
}: ToneExamplePopoverProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`p-1.5 rounded transition-colors ${
            isOpen
              ? 'bg-brand-hover text-brand-teal-dark'
              : 'text-text-tertiary hover:text-brand-teal-dark hover:bg-brand-hover'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-80 p-4 relative bg-white border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <span 
              className="font-semibold text-text-dark tracking-[-0.28px]"
              style={{ 
                fontSize: 'var(--font-size-14)',
                lineHeight: 'var(--line-height-14-140)'
              }}
            >
              {conceptLabel}
            </span>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded hover:bg-gray-200 text-text-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div 
            className="rounded-md border p-3 whitespace-pre-line border-gray-200 bg-gray-50 text-text-dark tracking-[-0.28px]"
            style={{ 
              fontSize: 'var(--font-size-14)',
              lineHeight: 'var(--line-height-14-140)'
            }}
          >
            {exampleText}
          </div>
        </div>
        
        {/* 말풍선 화살표 */}
        <div
          className="absolute left-4 -translate-x-0 w-0 h-0"
          style={{
            bottom: '-8px',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #ffffff',
          }}
        />
        <div
          className="absolute left-4 -translate-x-0 w-0 h-0"
          style={{
            bottom: '-9px',
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '8px solid #e5e7eb',
          }}
        />
      </PopoverContent>
    </Popover>
  )
})
