'use client'

import { memo } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ToneSelector } from './ToneSelector'
import type { ConceptType } from '@/lib/data/templates'

interface ConceptOption {
  id: ConceptType
  label: string
}

interface ToneOption {
  id: string
  label: string
  tier: string
}

interface ConceptCardProps {
  conceptOption: ConceptOption
  tones: ToneOption[]
  selectedScriptStyle: ConceptType | null
  selectedTone: string | null
  expandedConceptId: ConceptType | null
  openToneExampleId: string | null
  showConfirmPopover: boolean
  confirmPopoverToneId: string | null
  toneExamples: Record<string, string>
  onConceptToggle: (conceptId: ConceptType) => void
  onToneSelect: (conceptId: ConceptType, toneId: string) => void
  onToneExampleToggle: (toneId: string, open: boolean) => void
  onConfirm: () => void
  onReselect: () => void
  onConfirmPopoverChange: (open: boolean) => void
}

export const ConceptCard = memo(function ConceptCard({
  conceptOption,
  tones,
  selectedScriptStyle,
  selectedTone,
  expandedConceptId,
  openToneExampleId,
  showConfirmPopover,
  confirmPopoverToneId,
  toneExamples,
  onConceptToggle,
  onToneSelect,
  onToneExampleToggle,
  onConfirm,
  onReselect,
  onConfirmPopoverChange,
}: ConceptCardProps) {
  const isConceptSelected = selectedScriptStyle === conceptOption.id
  const isDimmed = selectedScriptStyle !== null && !isConceptSelected
  const selectedToneLabel = isConceptSelected
    ? tones.find((tone) => tone.id === selectedTone)?.label
    : null

  return (
    <Card
      className={`transition-all bg-white border-0 shadow-[var(--shadow-card-default)] ${isDimmed ? 'opacity-40' : ''}`}
    >
      <CardHeader
        onClick={() => onConceptToggle(conceptOption.id)}
        className="cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div>
            <CardTitle 
              className="font-bold text-text-dark tracking-[-0.36px]"
              style={{ 
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)'
              }}
            >
              {conceptOption.label}
            </CardTitle>
            {selectedToneLabel && (
              <p 
                className="mt-2 text-brand-teal-dark tracking-[-0.28px]"
                style={{ 
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-14-140)'
                }}
              >
                선택된 스타일: {selectedToneLabel}
              </p>
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform text-text-tertiary ${
              expandedConceptId === conceptOption.id ? 'rotate-180' : ''
            }`}
          />
        </div>
      </CardHeader>
      {expandedConceptId === conceptOption.id && (
        <CardContent>
          <ToneSelector
            tones={tones}
            conceptId={conceptOption.id}
            conceptLabel={conceptOption.label}
            selectedScriptStyle={selectedScriptStyle}
            selectedTone={selectedTone}
            openToneExampleId={openToneExampleId}
            showConfirmPopover={showConfirmPopover}
            confirmPopoverToneId={confirmPopoverToneId}
            toneExamples={toneExamples}
            onToneSelect={onToneSelect}
            onToneExampleToggle={onToneExampleToggle}
            onConfirm={onConfirm}
            onReselect={onReselect}
            onConfirmPopoverChange={onConfirmPopoverChange}
          />
        </CardContent>
      )}
    </Card>
  )
})
