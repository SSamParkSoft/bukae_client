'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

interface ConfirmPopoverProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  toneLabel: string
  onConfirm: () => void
  onReselect: () => void
}

export const ConfirmPopover = memo(function ConfirmPopover({
  isOpen,
  onOpenChange,
  toneLabel,
  onConfirm,
  onReselect,
}: ConfirmPopoverProps) {
  return (
    <Popover 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <div />
      </PopoverTrigger>
      
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="w-80 p-5 relative bg-white border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div 
            className="font-semibold text-text-dark tracking-[-0.32px]"
            style={{ 
              fontSize: 'var(--font-size-16)',
              lineHeight: 'var(--line-height-16-140)'
            }}
          >
            이 스타일로 확정하시겠어요?
          </div>
          
          <Input
            value={toneLabel}
            readOnly
            disabled
            className="bg-gray-50 border-gray-200 text-text-dark cursor-default pointer-events-none"
            onClick={(e) => e.preventDefault()}
            onFocus={(e) => e.target.blur()}
          />
          
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onReselect}
              className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
            >
              다시 선택하기
            </Button>
            <Button
              size="sm"
              onClick={onConfirm}
              className="flex-1 bg-brand-teal hover:bg-brand-teal-dark text-white"
            >
              확정하기
            </Button>
          </div>
        </div>
        
        {/* 말풍선 화살표 */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            bottom: '-8px',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #ffffff',
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
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
