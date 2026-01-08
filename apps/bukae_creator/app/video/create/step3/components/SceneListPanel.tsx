'use client'

import React, { memo } from 'react'
import { Grid3x3, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SceneList } from '@/components/video-editor/SceneList'
import type { TimelineData, SceneScript } from '@/store/useVideoCreateStore'

interface SceneListPanelProps {
  theme: string | undefined
  scenes: SceneScript[]
  timeline: TimelineData | null
  sceneThumbnails: Array<string | null>
  currentSceneIndex: number
  selectedPart: { sceneIndex: number; partIndex: number } | null
  showGrid: boolean
  stageDimensions: { width: number; height: number }
  transitionLabels: Record<string, string>
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  isPreparing: boolean
  isTtsBootstrapping: boolean
  onToggleGrid: () => void
  onResizeTemplate: () => void
  onSelect: (index: number) => void
  onScriptChange: (index: number, value: string) => void
  onImageFitChange: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  onReorder: (newOrder: number[]) => void
  onSplitScene: (index: number) => void
  onDeleteScene: (index: number) => void
  onDuplicateScene: (index: number) => void
  onTtsPreview: (sceneIndex: number, partIndex?: number) => Promise<void>
  onSelectPart: (sceneIndex: number, partIndex: number) => void
  onDuplicateGroup: (sceneId: number, groupIndices: number[]) => void
  onPlayGroup: (sceneId: number, groupIndices: number[]) => Promise<void>
  onDeleteGroup: (sceneId: number, groupIndices: number[]) => void
  onPlayScene: (sceneIndex: number) => Promise<void>
}

export const SceneListPanel = memo(function SceneListPanel({
  theme,
  scenes,
  timeline,
  sceneThumbnails,
  currentSceneIndex,
  selectedPart,
  showGrid,
  stageDimensions,
  transitionLabels,
  playingSceneIndex,
  playingGroupSceneId,
  isPreparing,
  isTtsBootstrapping,
  onToggleGrid,
  onResizeTemplate,
  onSelect,
  onScriptChange,
  onImageFitChange,
  onReorder,
  onSplitScene,
  onDeleteScene,
  onDuplicateScene,
  onTtsPreview,
  onSelectPart,
  onDuplicateGroup,
  onPlayGroup,
  onDeleteGroup,
  onPlayScene,
}: SceneListPanelProps) {
  return (
    <>
      <div className="p-4 border-b shrink-0 flex items-center" style={{
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        minHeight: '64px',
        marginTop: '2px',
      }}>
        <div className="flex items-center justify-between w-full">
          <h2 className="text-lg font-semibold" style={{
            color: theme === 'dark' ? '#ffffff' : '#111827'
          }}>
            씬 리스트
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={onToggleGrid}
              variant={showGrid ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              <Grid3x3 className="w-3 h-3 mr-1" />
              격자
            </Button>
            <Button
              onClick={onResizeTemplate}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              크기 조정하기
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <SceneList
          scenes={scenes}
          timeline={timeline}
          sceneThumbnails={sceneThumbnails}
          currentSceneIndex={currentSceneIndex}
          selectedPart={selectedPart}
          theme={theme}
          transitionLabels={transitionLabels}
          onSelect={onSelect}
          onScriptChange={onScriptChange}
          onImageFitChange={onImageFitChange}
          onReorder={onReorder}
          onSplitScene={onSplitScene}
          onDeleteScene={onDeleteScene}
          onDuplicateScene={onDuplicateScene}
          onTtsPreview={onTtsPreview}
          onSelectPart={onSelectPart}
          onDuplicateGroup={onDuplicateGroup}
          onPlayGroup={onPlayGroup}
          onDeleteGroup={onDeleteGroup}
          onPlayScene={onPlayScene}
          playingSceneIndex={playingSceneIndex}
          playingGroupSceneId={playingGroupSceneId}
          isPreparing={isPreparing}
          isTtsBootstrapping={isTtsBootstrapping}
        />
      </div>
    </>
  )
})

