'use client'

import { memo } from 'react'
import { GripVertical, Trash2, Loader2, Upload } from 'lucide-react'
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
        {/* 좌측: 드래그 핸들 + 영상 업로드 + 보이스 */}
        <div className="flex gap-4 sm:flex-col sm:min-w-[200px]">
          <div className="flex items-start gap-2">
            {onDragStart && (
              <div
                className="cursor-move pt-1 text-text-tertiary shrink-0 touch-none"
                aria-hidden
              >
                <GripVertical className="w-5 h-5" />
              </div>
            )}
            <button
              type="button"
              onClick={onUpload}
              className="flex-1 min-h-[100px] rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 hover:bg-gray-100/80 transition-colors flex flex-col items-center justify-center gap-2 text-text-tertiary"
            >
              <Upload className="w-6 h-6" />
              <span
                className="font-medium"
                style={{
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-14-140)',
                }}
              >
                + 영상 업로드
              </span>
            </button>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/60 px-3 py-2">
            <span
              className="text-text-secondary font-medium block mb-1"
              style={{
                fontSize: 'var(--font-size-12)',
                lineHeight: 'var(--line-height-12-140)',
              }}
            >
              보이스
            </span>
            <span
              className="text-text-tertiary text-sm"
              style={{
                fontSize: 'var(--font-size-14)',
                lineHeight: 'var(--line-height-14-140)',
              }}
            >
              (선택 영역)
            </span>
          </div>
        </div>

        {/* 우측: SCENE N + 삭제, 대본, 적용된 보이스 */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="font-bold text-text-dark tracking-[-0.36px]"
              style={{
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)',
              }}
            >
              SCENE {sceneIndex}
            </h3>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="shrink-0 text-text-tertiary hover:text-text-secondary hover:bg-gray-100"
                aria-label="장면 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <textarea
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="대본을 입력하세요."
            disabled={isGenerating}
            rows={4}
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
            className="text-text-tertiary"
            style={{
              fontSize: 'var(--font-size-12)',
              lineHeight: 'var(--line-height-12-140)',
            }}
          >
            적용된 보이스 {voiceLabel ? `| ${voiceLabel}` : ''}
          </div>
        </div>
      </div>
      {isDropTargetAfter && (
        <div className="h-0.5 bg-brand-teal rounded-full mt-3 -mb-3" aria-hidden />
      )}
    </div>
  )
})
