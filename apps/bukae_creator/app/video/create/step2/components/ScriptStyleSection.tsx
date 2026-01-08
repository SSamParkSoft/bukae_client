'use client'

import { memo } from 'react'
import { ConceptCard } from './ConceptCard'
import type { ConceptType } from '@/lib/data/templates'

interface ScriptStyleSectionProps {
  conceptOptions: Array<{ id: ConceptType; label: string }>
  conceptTones: Record<string, Array<{ id: string; label: string }>>
  selectedScriptStyle: ConceptType | null
  selectedTone: string | null
  expandedConceptId: ConceptType | null
  openToneExampleId: string | null
  showConfirmPopover: boolean
  confirmPopoverToneId: string | null
  toneExamples: Record<string, string>
  onConceptToggle: (conceptId: ConceptType) => void
  onToneSelect: (concept: ConceptType, toneId: string) => void
  onToneExampleToggle: (toneId: string, open: boolean) => void
  onConfirm: () => void
  onReselect: () => void
  onConfirmPopoverChange: (open: boolean) => void
}

export const ScriptStyleSection = memo(function ScriptStyleSection({
  conceptOptions,
  conceptTones,
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
}: ScriptStyleSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex gap-4">
        <h1 
          className="font-bold mb-2 text-text-dark tracking-[-0.48px]"
          style={{ 
            fontSize: 'var(--font-size-24)',
            lineHeight: 'var(--line-height-24-140)'
          }}
        >
          대본 및 스크립트 스타일 선택
        </h1>
        <p 
          className="mt-2 font-bold text-text-dark tracking-[-0.32px]"
          style={{ 
            fontSize: 'var(--font-size-16)',
            lineHeight: 'var(--line-height-16-140)'
          }}
        >
          원하는 대본 및 스크립트 스타일과 말투를 선택해주세요
        </p>
      </div>

      <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-[var(--shadow-container)]">
        <div className="space-y-6">
          {conceptOptions.map((conceptOption) => {
            const tones = conceptTones[conceptOption.id]
            return (
              <ConceptCard
                key={conceptOption.id}
                conceptOption={conceptOption}
                tones={tones}
                selectedScriptStyle={selectedScriptStyle}
                selectedTone={selectedTone}
                expandedConceptId={expandedConceptId}
                openToneExampleId={openToneExampleId}
                showConfirmPopover={showConfirmPopover}
                confirmPopoverToneId={confirmPopoverToneId}
                toneExamples={toneExamples}
                onConceptToggle={onConceptToggle}
                onToneSelect={onToneSelect}
                onToneExampleToggle={onToneExampleToggle}
                onConfirm={onConfirm}
                onReselect={onReselect}
                onConfirmPopoverChange={onConfirmPopoverChange}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
})
