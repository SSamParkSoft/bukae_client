'use client'

import { memo } from 'react'
import Image from 'next/image'
import { GripVertical, X, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface ProSceneCardProps {
  sceneIndex: number
  scriptText: string
  onScriptChange: (value: string) => void
  voiceLabel?: string
  onUpload?: () => void
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  isGenerating?: boolean
  /** 드래그 중인 카드 index (같으면 opacity 적용) */
  draggedIndex?: number | null
  /** 드롭 타깃 정보 (드롭 인디케이터 표시용) */
  dragOver?: { index: number; position: 'before' | 'after' } | null
}

export const ProSceneCard = memo(function ProSceneCard({
  sceneIndex,
  scriptText,
  onScriptChange,
  voiceLabel,
  onUpload,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isGenerating = false,
  draggedIndex = null,
  dragOver: dragOverProp = null,
}: ProSceneCardProps) {
  const isDragging = draggedIndex !== null && draggedIndex === sceneIndex - 1
  const isDropTargetBefore = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'after'

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border border-white/10 p-6 shadow-[var(--shadow-card-default)] transition-all ${
        isDragging ? 'opacity-50' : 'bg-white/80'
      }`}
    >
      {isDropTargetBefore && (
        <div className="h-0.5 bg-brand-teal rounded-full -mt-3 mb-3" aria-hidden />
      )}
      <div className="flex gap-6 flex-col sm:flex-row">
        {/* 좌측: 드래그 아이콘(왼쪽, 높이 중간) + 영상 업로드·보이스 한 div */}
        <div className="flex items-center gap-4 shrink-0">
          {onDragStart && (
            <div
              className="cursor-move text-text-tertiary shrink-0 touch-none self-center"
              aria-hidden
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}
          <div className="flex flex-col gap-4 shrink-0">
            <button
              type="button"
              onClick={onUpload}
              className="w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-lg overflow-hidden bg-[#606060] hover:bg-[#404040] transition-colors flex flex-col items-center justify-center gap-1.5 text-text-tertiary shrink-0"
            >
              <span
                className="font-bold text-white rounded-lg px-2 py-1 bg-white/20"
                style={{
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-14-140)',
                }}
              >
                + 영상 업로드
              </span>
            </button>
            <button
              type="button"
              className="w-20 h-10 sm:w-[120px] rounded-lg overflow-hidden bg-white border border-[#BBC9C9] hover:bg-[#e4eeed] transition-colors flex items-center justify-center gap-2 text-text-tertiary shrink-0 px-2"
              aria-label="보이스 선택"
            >
              <Image
                src="/e_voice.svg"
                alt="보이스"
                width={20}
                height={20}
                className="shrink-0"
              />
              <span
                className="font-semibold whitespace-nowrap"
                style={{
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-12-140)',
                }}
              >
                보이스
              </span>
            </button>
          </div>
        </div>

        {/* 우측: Scene N + 삭제, 대본, 적용된 보이스 */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-brand-teal tracking-[-0.36px]"
              style={{
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)',
                fontFamily: '"Zeroes Two", sans-serif',
                fontWeight: 400,
              }}
            >
              Scene {sceneIndex}
            </p>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                aria-label="장면 삭제"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <textarea
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="대본을 입력하세요."
            disabled={isGenerating}
            rows={2}
            className="w-full p-3 rounded-lg border border-gray-300 bg-white text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent resize-none disabled:opacity-60 shadow-[var(--shadow-card-default)]"
            style={{
              fontSize: 'var(--font-size-14)',
              lineHeight: 'var(--line-height-14-140)',
            }}
          />
          {isGenerating && (
            <div className="flex items-center gap-2 text-brand-teal text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>대본 생성 중...</span>
            </div>
          )}

          <div
            className="flex justify-end rounded-3xl border-2 border-white bg-white/30 px-3 py-2 shadow-[var(--shadow-card-default)] backdrop-blur-sm text-text-tertiary"
            style={{
              fontSize: 'var(--font-size-14)',
              lineHeight: 'var(--line-height-14-140)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            적용된 보이스 | {voiceLabel ? `${voiceLabel}` : ''}
          </div>
        </div>
      </div>
      {isDropTargetAfter && (
        <div className="h-0.5 bg-brand-teal rounded-full mt-3 -mb-3" aria-hidden />
      )}
    </div>
  )
})
