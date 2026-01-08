'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { SceneItem } from './SceneItem'
import type { SceneScript } from '@/lib/types/domain/script'

interface SelectedImageListProps {
  selectedImages: string[]
  sceneScripts: Map<number, SceneScript>
  editedScripts: Map<number, string>
  generatingScenes: Set<number>
  isGeneratingAll: boolean
  draggedIndex: number | null
  dragOver: { index: number; position: 'before' | 'after' } | null
  selectedListRef: React.RefObject<HTMLDivElement | null>
  onGenerateAllScripts: () => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent<HTMLDivElement>, index: number) => void
  onDrop: (e?: React.DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onScriptEdit: (index: number, value: string) => void
  onSceneDelete: (index: number) => void
}

export const SelectedImageList = memo(function SelectedImageList({
  selectedImages,
  sceneScripts,
  editedScripts,
  generatingScenes,
  isGeneratingAll,
  draggedIndex,
  dragOver,
  selectedListRef,
  onGenerateAllScripts,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onScriptEdit,
  onSceneDelete,
}: SelectedImageListProps) {
  return (
    <Card
      ref={selectedListRef}
      className="bg-white border-gray-200"
    >
      <CardContent>
        {/* AI 스크립트 생성 버튼 */}
        <div className="m-6">
          <button
            type="button"
            onClick={onGenerateAllScripts}
            disabled={isGeneratingAll}
            className="w-full h-[82px] rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-card-default)]"
          >
            <Image 
              src="/exclude.svg" 
              alt="AI" 
              width={24} 
              height={12}
              className="flex-shrink-0"
            />
            <span 
              className="font-bold tracking-[-0.48px]"
              style={{ 
                fontSize: 'var(--font-size-24)',
                lineHeight: '33.6px'
              }}
            >
              {isGeneratingAll ? 'AI 스크립트 생성 중...' : 'AI 스크립트 생성'}
            </span>
          </button>
        </div>

        <div 
          className="space-y-4"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDrop(e)
          }}
        >
          {selectedImages.map((imageUrl, index) => {
            const script = sceneScripts.get(index)
            const isGenerating = generatingScenes.has(index)
            const editedScript = editedScripts.get(index) ?? script?.script ?? ''
            
            return (
              <SceneItem
                key={`${imageUrl}-${index}`}
                index={index}
                imageUrl={imageUrl}
                script={script}
                editedScript={editedScript}
                isGenerating={isGenerating}
                draggedIndex={draggedIndex}
                dragOver={dragOver}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onScriptEdit={onScriptEdit}
                onSceneDelete={onSceneDelete}
              />
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
