'use client'

import { memo } from 'react'
import { Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProVideoEditSceneCard } from './ProVideoEditSceneCard'

export interface ProVideoEditSectionProps {
  scenes: Array<{
    id: string
    script: string
    ttsDuration?: number
    guideText?: string
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
    <section className="mb-16 space-y-6">
      {/* 섹션 헤더 */}
      <div className="space-y-4">
        <h2
          className="font-bold text-text-dark tracking-[-0.4px]"
          style={{
            fontSize: 'var(--font-size-20)',
            lineHeight: 'var(--line-height-20-140)',
          }}
        >
          촬영 가이드 생성 & 영상 업로드
        </h2>
        <p
          className="font-semibold text-brand-teal-dark tracking-[-0.32px]"
          style={{
            fontSize: 'var(--font-size-16)',
            lineHeight: 'var(--line-height-16-140)',
          }}
        >
          AI 촬영가이드를 생성하고, 영상을 업로드 및 원하는 영상 편집을 입력해주세요.
        </p>

        {/* AI 촬영가이드 생성 버튼 */}
        {onAiGuideGenerateAll && (
          <Button
            type="button"
            onClick={onAiGuideGenerateAll}
            className="w-full sm:w-auto bg-brand-teal hover:bg-brand-teal-dark text-white px-6 py-3 rounded-lg font-bold tracking-[-0.36px] shadow-(--shadow-card-default)"
            style={{
              fontSize: 'var(--font-size-18)',
              lineHeight: 'var(--line-height-18-140)',
            }}
          >
            <Cloud className="w-5 h-5" />
            AI 촬영가이드 생성
          </Button>
        )}
      </div>

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
