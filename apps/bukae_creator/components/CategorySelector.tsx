'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ScriptInput from './ScriptInput'

export interface CategoryOption {
  id: string
  label: string
}

interface CategorySelectorProps {
  title: string
  options: CategoryOption[]
  selectedOption?: string
  onSelect?: (optionId: string) => void
  className?: string
  defaultOpen?: boolean
}

export default function CategorySelector({
  title,
  options,
  selectedOption,
  onSelect,
  className,
  defaultOpen = false,
}: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-[#111111]">{title}</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-2xl"
        >
          {isOpen ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <ChevronDown className="w-6 h-6" />
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="space-y-3">
          {options.map((option) => (
            <ScriptInput
              key={option.id}
              value={option.label}
              state={selectedOption === option.id ? 'selected' : 'default'}
              onClick={() => onSelect?.(option.id)}
              readOnly
            />
          ))}
        </div>
      )}
    </Card>
  )
}
