'use client'

import React, { memo, useEffect, useRef, useState } from 'react'  
import { ProStep3SceneCard } from './ProStep3SceneCard'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { TimelineScene } from '@/lib/types/domain/timeline'

// Pro step3에서 사용하는 씬 데이터 타입
export interface ProStep3Scene {
  id: string
  script: string
  videoUrl?: string | null
  selectionStartSeconds: number
  selectionEndSeconds: number
  voiceLabel?: string
  voiceTemplate?: string | null
  ttsDuration?: number
}

interface ProSceneListPanelProps {
  theme: string | undefined
  scenes: ProStep3Scene[]
  timeline: TimelineData | null
  currentSceneIndex: number
  playingSceneIndex: number | null
  isPreparing: boolean
  isTtsBootstrapping: boolean
  onSelect: (index: number) => void
  onReorder: (newOrder: number[]) => void
  onPlayScene: (sceneIndex: number) => Promise<void>
  onOpenEffectPanel?: (tab: 'animation' | 'subtitle' | 'sound') => void
  onSelectionChange?: (sceneIndex: number, startSeconds: number, endSeconds: number) => void
}

export const ProSceneListPanel = memo(function ProSceneListPanel({
  scenes,
  timeline,
  currentSceneIndex,
  playingSceneIndex,
  isPreparing,
  isTtsBootstrapping,
  onSelect,
  onReorder,
  onPlayScene,
  onOpenEffectPanel,
  onSelectionChange,
}: ProSceneListPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const dropOccurredRef = useRef(false)
  const [showScrollGutter, setShowScrollGutter] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const updateGutterVisibility = () => {
      const hasScrollableContent = el.scrollHeight > el.clientHeight + 1
      const isActuallyScrolled = el.scrollTop > 0
      setShowScrollGutter(hasScrollableContent && isActuallyScrolled)
    }

    updateGutterVisibility()

    el.addEventListener('scroll', updateGutterVisibility)

    const resizeObserver = new ResizeObserver(() => {
      updateGutterVisibility()
    })
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', updateGutterVisibility)
      resizeObserver.disconnect()
    }
  }, [])

  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    dropOccurredRef.current = false
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (draggedIndex === null) return

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height
    const position = y < height / 2 ? 'before' : 'after'

    setDragOver({ index, position })
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedIndex === null || !dragOver) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }

    if (draggedIndex === dragOver.index) {
      setDraggedIndex(null)
      setDragOver(null)
      return
    }

    const newOrder = [...scenes]
    const [removed] = newOrder.splice(draggedIndex, 1)
    let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
    if (draggedIndex < targetIndex) targetIndex -= 1
    newOrder.splice(targetIndex, 0, removed)

    // 씬 순서 변경
    const newOrderIndices = newOrder.map((_, idx) => idx)
    onReorder(newOrderIndices)

    dropOccurredRef.current = true
    setDraggedIndex(null)
    setDragOver(null)
  }

  const handleDragEnd = (index: number) => () => {
    if (!dropOccurredRef.current) {
      onSelect(index)
    }
    dropOccurredRef.current = false
    setDraggedIndex(null)
    setDragOver(null)
  }

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* 중앙 패널만 세로 스크롤 가능 */}
      <div
        ref={scrollContainerRef}
        className="relative z-10 flex-1 overflow-y-auto pr-[24px] pt-0 pb-6 min-h-0"
      >
        <div 
          className="space-y-4"
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={handleDrop}
        >
          {Array.isArray(scenes) && scenes.length > 0 ? scenes.map((scene, index) => {
            const timelineScene = timeline?.scenes[index] as TimelineScene | undefined
            const isPlaying = playingSceneIndex === index
            const isSelected = currentSceneIndex === index

            return (
              <ProStep3SceneCard
                key={scene.id}
                sceneIndex={index}
                sceneOrderNumber={index + 1}
                scriptText={scene.script}
                videoUrl={scene.videoUrl}
                selectionStartSeconds={scene.selectionStartSeconds}
                selectionEndSeconds={scene.selectionEndSeconds}
                ttsDuration={scene.ttsDuration}
                voiceLabel={scene.voiceLabel}
                timelineScene={timelineScene}
                isPlaying={isPlaying}
                isSelected={isSelected}
                isPreparing={isPreparing}
                isTtsBootstrapping={isTtsBootstrapping}
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd(index)}
                draggedIndex={draggedIndex}
                dragOver={dragOver}
                onSelect={() => onSelect(index)}
                onPlayScene={async () => {
                  try {
                    await onPlayScene(index)
                  } catch (_) {
                    // 에러 무시
                  }
                }}
                onOpenEffectPanel={onOpenEffectPanel}
                onSelectionChange={onSelectionChange ? (startSeconds, endSeconds) => {
                  onSelectionChange(index, startSeconds, endSeconds)
                } : undefined}
              />
            )
          }) : (
            <div className="flex items-center justify-center h-32 text-text-tertiary">
              씬이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 스크롤바가 생겼을 때 오른쪽 흰색 배경 */}
      {showScrollGutter && (
        <div className="pointer-events-none absolute top-0 right-0 z-0 h-full w-[12px] bg-white" />
      )}
    </div>
  )
})
