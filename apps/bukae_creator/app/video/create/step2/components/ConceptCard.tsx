'use client'

import { memo, useState } from 'react'
import { Check, Megaphone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

  const handleCardClick = (e: React.MouseEvent) => {
    // 확성기 아이콘 클릭 시에는 카드 선택이 실행되지 않도록
    if ((e.target as HTMLElement).closest('[data-megaphone-trigger]')) {
      return
    }
    onStyleSelect(conceptOption.id)
  }

  return (
    <Card
      onClick={handleCardClick}
      className={`relative transition-all cursor-pointer bg-white border-0 shadow-(--shadow-card-default) hover:shadow-(--shadow-card-hover) ${
        isSelected 
          ? 'ring-2 ring-brand-teal border-brand-teal' 
          : ''
      }`}
    >
      <CardContent className="p-4 relative">
        {/* 선택 상태 표시를 절대 위치로 두어 레이아웃이 줄지 않도록 함 */}
        {isSelected && (
          <div className="absolute top-3 right-3">
            <Check className="w-5 h-5 text-brand-teal" />
          </div>
        )}

        <div className="flex items-start gap-2">
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
          <div className="flex-1 min-w-0">
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

        </div>
      </CardContent>
    </Card>
  )
})
