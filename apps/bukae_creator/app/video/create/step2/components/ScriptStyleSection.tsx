'use client'

import { memo } from 'react'
import { ConceptCard } from './ConceptCard'
import type { ConceptType } from '@/lib/data/templates'

interface ScriptStyleSectionProps {
  conceptOptions: Array<{ 
    id: ConceptType
    label: string
    description: string
    target: string
  }>
  selectedScriptStyle: ConceptType | null
  onStyleSelect: (concept: ConceptType) => void
}

export const ScriptStyleSection = memo(function ScriptStyleSection({
  conceptOptions,
  selectedScriptStyle,
  onStyleSelect,
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
          원하는 대본 및 스크립트 스타일을 선택해주세요
        </p>
      </div>

      <div className="rounded-2xl bg-white/40 border border-white/10 p-6 shadow-[var(--shadow-container)]">
        <div className="grid grid-cols-3 gap-4">
          {conceptOptions.map((conceptOption) => (
            <ConceptCard
              key={conceptOption.id}
              conceptOption={conceptOption}
              selectedScriptStyle={selectedScriptStyle}
              onStyleSelect={onStyleSelect}
            />
          ))}
        </div>
      </div>
    </section>
  )
})
