'use client'

import { memo } from 'react'
import { ProVideoEditSceneCard } from './ProVideoEditSceneCard'
import { AiScriptGenerateButton } from './script'

export interface ProVideoEditSectionProps {
  scenes: Array<{
    id: string
    script: string
    ttsDuration?: number
    guideText?: string
    voiceLabel?: string
    voiceTemplate?: string | null
    videoUrl?: string | null
    /** 업로드된 이미지 URL */
    imageUrl?: string | null
    selectionStartSeconds?: number
    selectionEndSeconds?: number
    /** 업로드된 원본 영상 길이(초). TTS보다 짧을 때 타임라인을 이어붙인 길이로 표시 */
    originalVideoDurationSeconds?: number
  }>
  onScriptChange: (index: number, value: string) => void
  onGuideChange?: (index: number, value: string) => void
  onVideoUpload?: (index: number, file: File) => Promise<void>
  onAiScriptClick?: (index: number) => void
  onAiGuideClick?: (index: number) => void
  onAiScriptGenerateAll?: () => void
  onAiGuideGenerateAll?: () => void
  isGeneratingScript?: boolean
  isGeneratingGuide?: boolean
  onSelectionChange?: (index: number, startSeconds: number, endSeconds: number) => void
  /** 드래그 앤 드롭 관련 */
  onDragStart?: (index: number) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDrop?: (e?: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  onVoiceClick?: (index: number) => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
  uploadingSceneIndex?: number | null
  /** 4MB 초과로 압축 중인 씬 인덱스 (업로드 중일 때만 유효) */
  compressingSceneIndex?: number | null
}

export const ProVideoEditSection = memo(function ProVideoEditSection({
  scenes,
  onScriptChange,
  onGuideChange,
  onVideoUpload,
  onAiScriptClick,
  onAiGuideClick,
  onAiScriptGenerateAll,
  onAiGuideGenerateAll,
  isGeneratingScript = false,
  isGeneratingGuide = false,
  onSelectionChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onVoiceClick,
  draggedIndex = null,
  dragOver: dragOverProp = null,
  uploadingSceneIndex = null,
  compressingSceneIndex = null,
}: ProVideoEditSectionProps) {
  return (
    <section className="space-y-6">
      {/* 상단: AI 스크립트 생성 / AI 촬영가이드 생성 버튼 */}
      {(onAiScriptGenerateAll || onAiGuideGenerateAll) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {onAiScriptGenerateAll && (
            <div className="flex-1">
              <AiScriptGenerateButton
                onClick={onAiScriptGenerateAll}
                loading={isGeneratingScript}
                labelIdle="AI 스크립트 생성"
                labelLoading="AI 스크립트 생성 중..."
              />
            </div>
          )}
          {onAiGuideGenerateAll && (
            <div className="flex-1">
              <AiScriptGenerateButton
                onClick={onAiGuideGenerateAll}
                loading={isGeneratingGuide}
                labelIdle="AI 촬영가이드 생성"
                labelLoading="AI 촬영가이드 생성 중..."
              />
            </div>
          )}
        </div>
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
            onVoiceClick={onVoiceClick ? () => onVoiceClick(index) : undefined}
            onVideoUpload={onVideoUpload ? (file) => onVideoUpload(index, file) : undefined}
            onAiScriptClick={onAiScriptClick ? () => onAiScriptClick(index) : undefined}
            onAiGuideClick={onAiGuideClick ? () => onAiGuideClick(index) : undefined}
            ttsDuration={scene.ttsDuration}
            videoUrl={scene.videoUrl}
            imageUrl={scene.imageUrl}
            isUploading={uploadingSceneIndex === index}
            isCompressing={compressingSceneIndex === index}
            initialSelectionStartSeconds={scene.selectionStartSeconds}
            initialSelectionEndSeconds={scene.selectionEndSeconds}
            originalVideoDurationSeconds={scene.originalVideoDurationSeconds}
            onSelectionChange={onSelectionChange ? (startSeconds, endSeconds) => onSelectionChange(index, startSeconds, endSeconds) : undefined}
            onDragStart={onDragStart ? (_e) => onDragStart(index) : undefined}
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
