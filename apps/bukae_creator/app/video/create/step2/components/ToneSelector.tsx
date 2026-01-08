'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { ToneExamplePopover } from './ToneExamplePopover'
import { ConfirmPopover } from './ConfirmPopover'
import type { ConceptType } from '@/lib/data/templates'

interface ToneOption {
  id: string
  label: string
  tier: string
}

interface ToneSelectorProps {
  tones: ToneOption[]
  conceptId: ConceptType
  conceptLabel: string
  selectedScriptStyle: ConceptType | null
  selectedTone: string | null
  openToneExampleId: string | null
  showConfirmPopover: boolean
  confirmPopoverToneId: string | null
  toneExamples: Record<string, string>
  onToneSelect: (conceptId: ConceptType, toneId: string) => void
  onToneExampleToggle: (toneId: string, open: boolean) => void
  onConfirm: () => void
  onReselect: () => void
  onConfirmPopoverChange: (open: boolean) => void
}

export const ToneSelector = memo(function ToneSelector({
  tones,
  conceptId,
  conceptLabel,
  selectedScriptStyle,
  selectedTone,
  openToneExampleId,
  showConfirmPopover,
  confirmPopoverToneId,
  toneExamples,
  onToneSelect,
  onToneExampleToggle,
  onConfirm,
  onReselect,
  onConfirmPopoverChange,
}: ToneSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tones.map((toneOption) => {
        const isToneSelected = selectedScriptStyle === conceptId && selectedTone === toneOption.id
        const isExampleOpen = openToneExampleId === toneOption.id
        const exampleText = toneExamples[toneOption.id] || '예시 텍스트가 준비 중입니다.'
        const showConfirm = showConfirmPopover && isToneSelected && confirmPopoverToneId === toneOption.id

        return (
          <div key={toneOption.id} className="flex items-center gap-2">
            <ToneExamplePopover
              isOpen={isExampleOpen}
              onOpenChange={(open) => onToneExampleToggle(toneOption.id, open)}
              conceptLabel={conceptLabel}
              exampleText={exampleText}
            />
            
            <div className="relative flex-1">
              <Button
                variant="outline"
                onClick={() => onToneSelect(conceptId, toneOption.id)}
                className={`w-full justify-start ${
                  isToneSelected
                    ? 'border-brand-teal bg-brand-hover'
                    : ''
                }`}
              >
                <span className="flex-1 text-left">{toneOption.label}</span>
              </Button>
              
              {showConfirm && (
                <ConfirmPopover
                  isOpen={showConfirm}
                  onOpenChange={onConfirmPopoverChange}
                  toneLabel={toneOption.label}
                  onConfirm={onConfirm}
                  onReselect={onReselect}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
})
