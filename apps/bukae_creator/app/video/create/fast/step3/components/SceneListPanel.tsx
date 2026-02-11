'use client'

import { memo } from 'react'
import { SceneList } from '@/components/video-editor/SceneList'
import type { TimelineData, SceneScript } from '@/store/useVideoCreateStore'
import { useScrollableGutter } from '@/app/video/create/_hooks/step3'

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
  onOpenEffectPanel?: (tab: 'animation' | 'subtitle' | 'voice' | 'sound') => void
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
  onOpenEffectPanel,
}: SceneListPanelProps) {
  const { scrollContainerRef, showScrollGutter } = useScrollableGutter()

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* 중앙 패널만 세로 스크롤 가능 */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto pr-[24px] pt-0 pb-6 min-h-0"
      >
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
            onOpenEffectPanel={onOpenEffectPanel}
          />
        </div>
      </div>

      {/* 스크롤바가 생겼을 때 오른쪽 흰색 배경 (z-0으로 스크롤 영역·스크롤바 아래에 둠) */}
      {showScrollGutter && (
        <div className="pointer-events-none absolute top-0 right-0 z-0 h-full w-[12px] bg-white" />
      )}
    </div>
  )
})
