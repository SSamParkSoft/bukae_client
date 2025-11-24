'use client'

import { useMemo } from 'react'
import type { RefObject } from 'react'
import { RefreshCw, GripVertical } from 'lucide-react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AutoScene } from '@/lib/types/video'
import { useThemeStore } from '@/store/useThemeStore'

interface SceneScriptBoardProps {
  scenes: AutoScene[]
  conceptLabel: string
  toneLabel: string
  isRegenerating: boolean
  minSelection?: number
  sceneStatuses: Record<
    string,
    {
      state: 'idle' | 'loading' | 'ready'
      progress: number
      stage: number
    }
  >
  onSceneChange: (sceneId: string, updates: Partial<AutoScene>) => void
  onRegenerateScripts: () => void
  onReorderScenes: (sceneIds: string[]) => void
  sectionRef?: RefObject<HTMLDivElement | null>
  isGenerating?: boolean
}

export default function SceneScriptBoard({
  scenes,
  conceptLabel,
  toneLabel,
  isRegenerating,
  minSelection = 4,
  sceneStatuses,
  onSceneChange,
  onRegenerateScripts,
  onReorderScenes,
  sectionRef,
  isGenerating = false,
}: SceneScriptBoardProps) {
  const theme = useThemeStore((state) => state.theme)
  const canRenderScenes = scenes.length >= minSelection
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const currentIds = scenes.map((scene) => scene.id)
    const oldIndex = currentIds.indexOf(active.id as string)
    const newIndex = currentIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = [...currentIds]
    reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, active.id as string)
    onReorderScenes(reordered)
  }

  const totalCharacters = useMemo(
    () =>
      scenes.reduce((sum, scene) => {
        const status = sceneStatuses[scene.id]
        if (status?.state !== 'ready') return sum
        return sum + scene.editedScript.length
      }, 0),
    [scenes, sceneStatuses],
  )

  return (
    <div className="space-y-4" ref={sectionRef}>
      <div className="flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            2. 장면별 AI 추천 대본
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            선택한 스타일 · 말투를 기준으로 이미지마다 적합한 대본이 자동 생성돼요. 카드를 드래그하면 순서를 바꿀 수
            있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs md:text-sm">
            <Badge variant="secondary">{conceptLabel}</Badge>
            <Badge variant="secondary">{toneLabel}</Badge>
            <Badge variant="outline">총 {totalCharacters}자</Badge>
            <Badge variant="outline" className="border-dashed">
              드래그로 순서 변경
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          {isGenerating && (
            <span className="text-sm font-semibold text-purple-500">AI가 대본을 생성중이에요...</span>
          )}
          <Button
            variant="outline"
            onClick={onRegenerateScripts}
            disabled={isRegenerating || !canRenderScenes}
            className="gap-2 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            AI 추천 다시 받기
          </Button>
        </div>
      </div>

      {!canRenderScenes && (
        <div
          className={`rounded-2xl border border-dashed p-6 text-center ${
            theme === 'dark' ? 'border-gray-200 text-gray-400' : 'border-gray-300 text-gray-600'
          }`}
        >
          최소 {minSelection}장 이상 이미지를 선택하면 장면별 스크립트가 자동으로 생성됩니다.
        </div>
      )}

      {canRenderScenes && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={scenes.map((scene) => scene.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {scenes.map((scene, index) => (
                <SortableSceneCard
                  key={scene.id}
                  scene={scene}
                  index={index}
                  theme={theme}
                  sceneStatuses={sceneStatuses}
                  onSceneChange={onSceneChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableSceneCard({
  scene,
  index,
  theme,
  sceneStatuses,
  onSceneChange,
}: {
  scene: AutoScene
  index: number
  theme: string
  sceneStatuses: SceneScriptBoardProps['sceneStatuses']
  onSceneChange: SceneScriptBoardProps['onSceneChange']
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id })

  const status = sceneStatuses[scene.id]

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${theme === 'dark' ? 'border-gray-200 bg-gray-900/50' : 'border-gray-200 bg-white'} ${
        isDragging ? 'ring-2 ring-purple-400 shadow-lg' : ''
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <button
            className="rounded-full border border-gray-300 p-1 text-gray-500 hover:text-purple-500"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold text-purple-500">Scene {index + 1}</p>
            <CardTitle className="text-base">{scene.imageLabel}</CardTitle>
          </div>
        </div>
        <Badge variant="secondary">
          {status?.state === 'ready' ? '대본 준비 완료' : status?.state === 'loading' ? '분석 중' : '대기 중'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-[160px_1fr]">
          <div className={`overflow-hidden rounded-xl border ${theme === 'dark' ? 'border-gray-200' : 'border-gray-200'}`}>
            <img src={scene.imageUrl} alt={scene.imageLabel} className="h-full w-full object-cover" />
          </div>
          {status?.state === 'ready' ? (
            <div className="space-y-3">
              <textarea
                value={scene.editedScript}
                onChange={(e) => onSceneChange(scene.id, { editedScript: e.target.value })}
                rows={5}
                className={`w-full rounded-xl border p-3 text-sm leading-relaxed ${
                  theme === 'dark'
                    ? 'border-gray-200 bg-gray-900 text-white placeholder-gray-500'
                    : 'border-gray-200 bg-white text-gray-900 placeholder-gray-500'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder="장면에 어울리는 스크립트를 입력하세요."
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{scene.editedScript.length}자</span>
                <button
                  type="button"
                  className="text-purple-500 underline cursor-pointer"
                  onClick={() => onSceneChange(scene.id, { editedScript: scene.recommendedScript })}
                >
                  추천 문장으로 되돌리기
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center ${
                theme === 'dark' ? 'border-gray-200 text-gray-300' : 'border-gray-200 text-gray-600'
              }`}
            >
              <p className="text-sm font-semibold text-purple-500">대본 생성하기 버튼을 눌러주세요</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


