'use client'

import { GripVertical, Play, Pause } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export interface SceneItem {
  id: string
  thumbnail?: string
  title: string
  script: string
  isPlaying?: boolean
}

interface SceneListProps {
  scenes: SceneItem[]
  onSceneClick?: (sceneId: string) => void
  onPlayToggle?: (sceneId: string) => void
  onSelect?: (sceneId: string) => void
  selectedSceneId?: string
  className?: string
}

export default function SceneList({
  scenes,
  onSceneClick,
  onPlayToggle,
  onSelect,
  selectedSceneId,
  className,
}: SceneListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {scenes.map((scene) => {
        const isSelected = selectedSceneId === scene.id

        return (
          <Card
            key={scene.id}
            className={cn(
              'p-4 flex items-center gap-4 cursor-pointer transition-all',
              isSelected && 'ring-2 ring-[#5e8790]'
            )}
            onClick={() => onSceneClick?.(scene.id)}
          >
            {/* 드래그 핸들 */}
            <GripVertical className="w-6 h-6 text-[#5d5d5d] shrink-0 cursor-grab" />

            {/* 썸네일 */}
            <div className="w-24 h-24 rounded-lg bg-[#a6a6a6] shrink-0 overflow-hidden">
              {scene.thumbnail ? (
                <Image
                  src={scene.thumbnail}
                  alt={scene.title}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  썸네일 없음
                </div>
              )}
            </div>

            {/* 제목 및 스크립트 */}
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-[#111111] mb-1">
                {scene.title}
              </h4>
              <p className="text-sm font-medium text-[#5d5d5d] line-clamp-2">
                {scene.script}
              </p>
            </div>

            {/* 재생 버튼 */}
            {onPlayToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  onPlayToggle(scene.id)
                }}
                className="shrink-0"
              >
                {scene.isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
              </Button>
            )}

            {/* 선택 버튼 */}
            {onSelect && (
              <Button
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(scene.id)
                }}
                className="shrink-0"
              >
                {isSelected ? '선택됨' : '선택'}
              </Button>
            )}
          </Card>
        )
      })}

      {/* 하단 버튼들 */}
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1">
          자막 장면 분할
        </Button>
        <Button variant="outline" className="flex-1">
          비율 유지
        </Button>
      </div>
    </div>
  )
}
