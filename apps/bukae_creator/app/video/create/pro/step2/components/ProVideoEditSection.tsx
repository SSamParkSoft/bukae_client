'use client'

import { memo } from 'react'
import { ProVideoEditSceneCard } from './ProVideoEditSceneCard'
import { AiScriptGenerateButton } from '@/app/video/create/_components'

export interface ProVideoEditSectionProps {
  scenes: Array<{
    id: string
    script: string
    ttsDuration?: number
    guideText?: string
    voiceLabel?: string
  }>
  onScriptChange: (index: number, value: string) => void
  onGuideChange?: (index: number, value: string) => void
  onVideoUpload?: (index: number) => void
  onAiScriptClick?: (index: number) => void
  onAiGuideClick?: (index: number) => void
  onAiGuideGenerateAll?: () => void
  /** 드래그 앤 드롭 관련 */
  onDragStart?: (index: number) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDrop?: (e?: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
}

export const ProVideoEditSection = memo(function ProVideoEditSection({
  scenes,
  onScriptChange,
  onGuideChange,
  onVideoUpload,
  onAiScriptClick,
  onAiGuideClick,
  onAiGuideGenerateAll,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedIndex = null,
  dragOver: dragOverProp = null,
}: ProVideoEditSectionProps) {
  return (
    <section className="space-y-6">
      {/* 상단: AI 촬영가이드 생성 버튼 */}
      {onAiGuideGenerateAll && (
        <AiScriptGenerateButton
          onClick={onAiGuideGenerateAll}
          labelIdle="AI 촬영가이드 생성"
          labelLoading="AI 촬영가이드 생성 중..."
        />
      )}

      {/* 씬 카드 목록 */}
      <div
        className="space-y-6"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDrop?.(e)
        }}
      >
        {scenes.map((scene, index) => (
          <ProVideoEditSceneCard
            key={scene.id}
            sceneIndex={index + 1}
            scriptText={scene.script}
            onScriptChange={(value) => onScriptChange(index, value)}
            guideText={scene.guideText}
            onGuideChange={onGuideChange ? (value) => onGuideChange(index, value) : undefined}
            voiceLabel={scene.voiceLabel}
            onVideoUpload={onVideoUpload ? () => onVideoUpload(index) : undefined}
            onAiScriptClick={onAiScriptClick ? () => onAiScriptClick(index) : undefined}
            onAiGuideClick={onAiGuideClick ? () => onAiGuideClick(index) : undefined}
            ttsDuration={scene.ttsDuration}
            onDragStart={onDragStart ? (e) => onDragStart(index) : undefined}
            onDragOver={onDragOver ? (e) => onDragOver(e, index) : undefined}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            draggedIndex={draggedIndex}
            dragOver={dragOverProp}
          />
        ))}
      </div>
    </section>
  )
})
