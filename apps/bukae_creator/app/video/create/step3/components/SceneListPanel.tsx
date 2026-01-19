'use client'

import React, { memo } from 'react'
import { SceneList } from '@/components/video-editor/SceneList'
import type { TimelineData, SceneScript } from '@/store/useVideoCreateStore'

interface SceneListPanelProps {
  theme: string | undefined
  scenes: SceneScript[]
  timeline: TimelineData | null
  sceneThumbnails: Array<string | null>
  currentSceneIndex: number
  selectedPart: { sceneIndex: number; partIndex: number } | null
  transitionLabels: Record<string, string>
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  isPreparing: boolean
  isTtsBootstrapping: boolean
  voiceTemplate: string | null
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
  onVoiceTemplateChange: (sceneIndex: number, voiceTemplate: string | null) => void
}

export const SceneListPanel = memo(function SceneListPanel({
  theme,
  scenes,
  timeline,
  sceneThumbnails,
  currentSceneIndex,
  selectedPart,
  transitionLabels,
  playingSceneIndex,
  playingGroupSceneId,
  isPreparing,
  isTtsBootstrapping,
  voiceTemplate,
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
  onVoiceTemplateChange,
}: SceneListPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 pt-0 pb-6 min-h-0">
        <div className="space-y-4">
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
            voiceTemplate={voiceTemplate}
            onVoiceTemplateChange={onVoiceTemplateChange}
          />
        </div>
      </div>
    </div>
  )
})

