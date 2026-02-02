'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AiScriptGenerateButton } from '@/app/video/create/_components'
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
      className="bg-white/40 border-white/10 shadow-[var(--shadow-container)]"
    >
      <CardContent>
        <AiScriptGenerateButton onClick={onGenerateAllScripts} loading={isGeneratingAll} />

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
