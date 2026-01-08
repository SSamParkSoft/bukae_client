'use client'

import { memo } from 'react'
import Image from 'next/image'
import { GripVertical, X, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PRODUCT_PLACEHOLDER } from '@/lib/utils/placeholder-image'
import type { SceneScript } from '@/lib/types/domain/script'

interface SceneItemProps {
  index: number
  imageUrl: string
  script: SceneScript | undefined
  editedScript: string
  isGenerating: boolean
  draggedIndex: number | null
  dragOver: { index: number; position: 'before' | 'after' } | null
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDrop: (e?: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onScriptEdit: (index: number, value: string) => void
  onSceneDelete: (index: number) => void
}

export const SceneItem = memo(function SceneItem({
  index,
  imageUrl,
  script,
  editedScript,
  isGenerating,
  draggedIndex,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onScriptEdit,
  onSceneDelete,
}: SceneItemProps) {
  return (
    <div className="space-y-2">
      {dragOver && dragOver.index === index && dragOver.position === 'before' && (
        <div className="h-0.5 bg-brand-teal rounded-full" />
      )}
      <div
        draggable
        onDragStart={(e) => {
          onDragStart(index)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDragOver(e, index)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDrop(e)
        }}
        onDragEnd={onDragEnd}
        className={`p-4 rounded-lg transition-all shadow-[var(--shadow-card-default)] border-0 ${
          draggedIndex === index
            ? 'opacity-50'
            : 'bg-white/80'
        }`}
      >
        <div className="flex items-center gap-4">
          <GripVertical className="w-5 h-5 cursor-move text-text-tertiary shrink-0" />
          
          <div className="relative w-20 h-20 sm:w-[120px] sm:h-[120px] rounded-lg overflow-hidden bg-bg-gray-placeholder shrink-0">
            <Image
              src={imageUrl}
              alt={`Image ${index + 1}`}
              fill
              sizes="(max-width: 640px) 80px, 120px"
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = PRODUCT_PLACEHOLDER
              }}
            />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <p 
                className="font-bold text-text-dark tracking-[-0.36px]"
                style={{ 
                  fontSize: 'var(--font-size-18)',
                  lineHeight: 'var(--line-height-18-140)'
                }}
              >
                Scene {index + 1}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSceneDelete(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {isGenerating ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand-teal-dark" />
                <p 
                  className="text-text-muted tracking-[-0.28px]"
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: 'var(--line-height-14-140)'
                  }}
                >
                  AI가 대본을 생성하고 있어요...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {script?.isAiGenerated && (
                  <div 
                    className="inline-flex items-center gap-2 rounded-full bg-brand-hover px-2 py-1 font-medium text-brand-teal-dark tracking-[-0.24px]"
                    style={{ 
                      fontSize: 'var(--font-size-12)',
                      lineHeight: 'var(--line-height-12-140)'
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    AI 생성 스크립트
                  </div>
                )}
                <textarea
                  value={editedScript}
                  onChange={(e) => onScriptEdit(index, e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded-lg border resize-none bg-white border-gray-300 text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-teal tracking-[-0.28px] shadow-[var(--shadow-card-default)]"
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: 'var(--line-height-14-140)'
                  }}
                  placeholder="이 씬에서 말할 내용을 자유롭게 입력하거나, 이미지 선택 영역 우측 하단의 AI 스크립트 생성 버튼을 눌러 자동으로 만들어보세요."
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {dragOver && dragOver.index === index && dragOver.position === 'after' && (
        <div className="h-0.5 bg-brand-teal rounded-full" />
      )}
    </div>
  )
})
