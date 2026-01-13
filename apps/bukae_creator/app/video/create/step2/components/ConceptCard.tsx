'use client'

import { memo, useState } from 'react'
import { Check, Megaphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { ConceptType } from '@/lib/data/templates'

interface ConceptOption {
  id: ConceptType
  label: string
  description: string
  target: string
}

interface ConceptCardProps {
  conceptOption: ConceptOption
  selectedScriptStyle: ConceptType | null
  onStyleSelect: (concept: ConceptType) => void
}

export const ConceptCard = memo(function ConceptCard({
  conceptOption,
  selectedScriptStyle,
  onStyleSelect,
}: ConceptCardProps) {
  const isSelected = selectedScriptStyle === conceptOption.id
  const [isDescriptionPopoverOpen, setIsDescriptionPopoverOpen] = useState(false)
  const [isConfirmPopoverOpen, setIsConfirmPopoverOpen] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // 확성기 아이콘 클릭 시에는 카드 선택이 실행되지 않도록
    if ((e.target as HTMLElement).closest('[data-megaphone-trigger]')) {
      return
    }
    // 확인 팝업 열기
    setIsConfirmPopoverOpen(true)
  }

  const handleConfirm = () => {
    onStyleSelect(conceptOption.id)
    setIsConfirmPopoverOpen(false)
  }

  const handleCancel = () => {
    setIsConfirmPopoverOpen(false)
  }

  return (
    <Popover open={isConfirmPopoverOpen} onOpenChange={setIsConfirmPopoverOpen}>
      <PopoverTrigger asChild>
        <Card
          onClick={handleCardClick}
          className={`relative transition-all cursor-pointer bg-white border-0 shadow-(--shadow-card-default) hover:shadow-(--shadow-card-hover) ${
            isSelected 
              ? 'ring-2 ring-brand-teal border-brand-teal' 
              : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              {/* 확성기 아이콘 */}
              <div className="shrink-0" data-megaphone-trigger>
                <Popover open={isDescriptionPopoverOpen} onOpenChange={setIsDescriptionPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsDescriptionPopoverOpen(!isDescriptionPopoverOpen)
                      }}
                      className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="설명 보기"
                    >
                      <Megaphone className="w-4 h-4 text-brand-teal hover:text-brand-teal-dark" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    side="top" 
                    align="start"
                    className="w-80 p-4 bg-white border border-gray-200 shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p 
                      className="text-text-secondary tracking-[-0.28px] leading-relaxed"
                      style={{ 
                        fontSize: 'var(--font-size-14)',
                        lineHeight: 'var(--line-height-14-140)'
                      }}
                    >
                      {conceptOption.description}
                    </p>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Title과 Subtitle을 한 div로 */}
              <div className="flex-1">
                <h3 
                  className="font-bold text-text-dark tracking-[-0.36px] mb-2"
                  style={{ 
                    fontSize: 'var(--font-size-18)',
                    lineHeight: 'var(--line-height-18-140)'
                  }}
                >
                  {conceptOption.label}
                </h3>
                <p 
                  className="text-text-tertiary tracking-[-0.24px]"
                  style={{ 
                    fontSize: 'var(--font-size-12)',
                    lineHeight: 'var(--line-height-12-140)'
                  }}
                >
                  {conceptOption.target}
                </p>
              </div>

              {/* 체크 아이콘 */}
              {isSelected && (
                <div className="shrink-0">
                  <Check className="w-5 h-5 text-brand-teal" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>

      {/* 확인 팝업 */}
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
          
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 bg-white border-gray-300 text-text-dark hover:bg-gray-50"
            >
              다시 선택하기
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
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
            borderTop: '9px solid #e5e7eb',
          }}
        />
      </PopoverContent>
    </Popover>
  )
})
