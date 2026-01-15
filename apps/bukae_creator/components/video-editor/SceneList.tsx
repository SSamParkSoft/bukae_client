import { useState } from 'react'
import Image from 'next/image'
import { GripVertical, Copy, Trash2, Play, Pause, Loader2, ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TimelineData } from '@/lib/types/domain/timeline'
import type { SceneScript } from '@/lib/types/domain/script'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { getScenePlaceholder } from '@/lib/utils/placeholder-image'

interface SceneListProps {
  scenes: SceneScript[]
  timeline: TimelineData | null
  sceneThumbnails: Array<string | null>
  currentSceneIndex: number
  selectedPart?: { sceneIndex: number; partIndex: number } | null
  theme: string | undefined
  onSelect: (index: number) => void
  onSelectPart?: (sceneIndex: number, partIndex: number) => void
  onScriptChange: (index: number, value: string) => void
  onImageFitChange: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  onReorder: (newOrder: number[]) => void
  transitionLabels: Record<string, string>
  onSplitScene?: (index: number) => void
  onDeleteScene?: (index: number) => void
  onDuplicateScene?: (index: number) => void
  onTtsPreview?: (sceneIndex: number, partIndex?: number) => Promise<void>
  onPlayScene?: (sceneIndex: number) => Promise<void>
  onDuplicateGroup?: (sceneId: number, groupIndices: number[]) => void
  onPlayGroup?: (sceneId: number, groupIndices: number[]) => Promise<void>
  onDeleteGroup?: (sceneId: number, groupIndices: number[]) => void
  playingSceneIndex?: number | null // 현재 재생 중인 씬 인덱스
  playingGroupSceneId?: number | null // 현재 재생 중인 그룹의 sceneId
  isPreparing?: boolean // TTS 준비 중인지 여부
  isTtsBootstrapping?: boolean // TTS 부트스트래핑 중인지 여부
}

export function SceneList({
  scenes,
  timeline,
  sceneThumbnails,
  currentSceneIndex,
  selectedPart,
  onSelect,
  onScriptChange,
  onImageFitChange,
  onReorder,
  onSplitScene,
  onDeleteScene,
  onDuplicateScene,
  onTtsPreview,
  onSelectPart,
  onPlayScene,
  onDuplicateGroup,
  onPlayGroup,
  onDeleteGroup,
  playingSceneIndex,
  playingGroupSceneId,
  isPreparing,
  isTtsBootstrapping,
}: SceneListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [previewingSceneIndex, setPreviewingSceneIndex] = useState<number | null>(null)
  const [previewingPartIndex, setPreviewingPartIndex] = useState<number | null>(null)
  const [draggedGroupId, setDraggedGroupId] = useState<number | null>(null) // 드래그 중인 그룹의 sceneId

  // 씬 구조 정보 store
  const sceneStructureStore = useSceneStructureStore()

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
    const scene = scenes[index]
    if (scene) {
      const groupScenes = scenes.filter(s => s.sceneId === scene.sceneId)
      if (groupScenes.length > 1) {
        setDraggedGroupId(scene.sceneId)
      } else {
        setDraggedGroupId(null)
      }
    }
  }

  // 그룹 드래그 시작
  const handleGroupDragStart = (groupSceneId: number) => {
    const groupScenes = scenes.filter(s => s.sceneId === groupSceneId)
    if (groupScenes.length > 0) {
      setDraggedIndex(groupScenes[0].sceneId ? scenes.findIndex(s => s.sceneId === groupSceneId) : 0)
      setDraggedGroupId(groupSceneId)
    }
  }

  // 드롭 위치 계산
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    
    if (draggedIndex === null) return
    
    const draggedScene = scenes[draggedIndex]
    const targetScene = scenes[index]
    
    // 그룹 드래그인 경우
    if (draggedGroupId !== null) {
      // 같은 그룹으로 드래그하는 것은 허용하지 않음
      if (targetScene.sceneId === draggedGroupId) {
        return
      }
    } else {
      // 개별 씬 드래그인 경우
      const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedScene.sceneId)
      
      // 그룹화된 씬은 같은 그룹 내에서만 이동 가능
      if (draggedGroupScenes.length > 1 && draggedScene.sceneId !== targetScene.sceneId) {
        // 다른 그룹으로 드래그하면 드롭 위치 표시 안 함
        return
      }
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }

  // 그룹 드롭 위치 계산
  const handleGroupDragOver = (event: React.DragEvent<HTMLDivElement>, targetGroupSceneId: number) => {
    event.preventDefault()
    
    if (draggedGroupId === null) return
    
    // 같은 그룹으로 드래그하는 것은 허용하지 않음
    if (targetGroupSceneId === draggedGroupId) {
      return
    }
    
    const targetGroupScenes = scenes.filter(s => s.sceneId === targetGroupSceneId)
    if (targetGroupScenes.length === 0) return
    
    const targetIndex = targetGroupScenes[0].sceneId ? scenes.findIndex(s => s.sceneId === targetGroupSceneId) : 0
    
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index: targetIndex, position })
  }

  // 드롭
  const handleDrop = (event?: React.DragEvent<HTMLDivElement>) => {
    event?.preventDefault()
    if (draggedIndex === null || !dragOver) return

    // 그룹 드래그인 경우
    if (draggedGroupId !== null) {
      const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedGroupId)
      const draggedIndices = draggedGroupScenes.map(s => scenes.indexOf(s)).filter(idx => idx !== -1).sort((a, b) => a - b)
      
      if (draggedIndices.length === 0) {
        setDraggedIndex(null)
        setDraggedGroupId(null)
        setDragOver(null)
        return
      }

      const targetScene = scenes[dragOver.index]
      
      // 같은 그룹으로 드롭하려고 하면 무시
      if (targetScene.sceneId === draggedGroupId) {
        setDraggedIndex(null)
        setDraggedGroupId(null)
        setDragOver(null)
        return
      }

      // 순서 변경 - 그룹의 모든 씬을 함께 이동
      const newOrder = scenes.map((_, idx) => idx)
      
      // 드래그된 그룹의 모든 인덱스 제거
      for (let i = draggedIndices.length - 1; i >= 0; i--) {
        newOrder.splice(draggedIndices[i], 1)
      }

      let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
      
      // 제거된 인덱스 개수만큼 조정
      const removedBeforeTarget = draggedIndices.filter(idx => idx < targetIndex).length
      targetIndex -= removedBeforeTarget

      // 그룹의 모든 씬을 새로운 위치에 삽입
      newOrder.splice(targetIndex, 0, ...draggedIndices)
      onReorder(newOrder)

      setDraggedIndex(null)
      setDraggedGroupId(null)
      setDragOver(null)
      return
    }

    // 개별 씬 드래그인 경우
    const draggedScene = scenes[draggedIndex]
    const targetScene = scenes[dragOver.index]
    
    // 같은 sceneId를 가진 씬들 찾기 (같은 그룹)
    const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedScene.sceneId)
    
    // 그룹화된 씬은 같은 그룹 내에서만 이동 가능
    if (draggedGroupScenes.length > 1 && draggedScene.sceneId !== targetScene.sceneId) {
      // 다른 그룹으로 드롭하려고 하면 무시
      setDraggedIndex(null)
      setDraggedGroupId(null)
      setDragOver(null)
      return
    }

    // 순서 변경
    const newOrder = scenes.map((_, idx) => idx)
    const [removed] = newOrder.splice(draggedIndex, 1)

    let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
    if (draggedIndex < targetIndex) {
      targetIndex -= 1
    }

    // 그룹화된 씬인 경우 같은 그룹 내에서만 이동 가능하도록 확인
    if (draggedGroupScenes.length > 1) {
      const finalTargetScene = scenes[targetIndex]
      if (finalTargetScene.sceneId !== draggedScene.sceneId) {
        setDraggedIndex(null)
        setDraggedGroupId(null)
        setDragOver(null)
        return
      }
    }

    newOrder.splice(targetIndex, 0, removed)
    onReorder(newOrder)

    setDraggedIndex(null)
    setDraggedGroupId(null)
    setDragOver(null)
  }

  // 그룹 드롭
  const handleGroupDrop = (event?: React.DragEvent<HTMLDivElement>) => {
    event?.preventDefault()
    if (draggedGroupId === null || !dragOver) return

    const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedGroupId)
    const draggedIndices = draggedGroupScenes.map(s => scenes.indexOf(s)).filter(idx => idx !== -1).sort((a, b) => a - b)
    
    if (draggedIndices.length === 0) {
      setDraggedIndex(null)
      setDraggedGroupId(null)
      setDragOver(null)
      return
    }

    const targetScene = scenes[dragOver.index]
    
    // 같은 그룹으로 드롭하려고 하면 무시
    if (targetScene.sceneId === draggedGroupId) {
      setDraggedIndex(null)
      setDraggedGroupId(null)
      setDragOver(null)
      return
    }

    // 순서 변경 - 그룹의 모든 씬을 함께 이동
    const newOrder = scenes.map((_, idx) => idx)
    
    // 드래그된 그룹의 모든 인덱스 제거
    for (let i = draggedIndices.length - 1; i >= 0; i--) {
      newOrder.splice(draggedIndices[i], 1)
    }

    let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
    
    // 제거된 인덱스 개수만큼 조정
    const removedBeforeTarget = draggedIndices.filter(idx => idx < targetIndex).length
    targetIndex -= removedBeforeTarget

    // 그룹의 모든 씬을 새로운 위치에 삽입
    newOrder.splice(targetIndex, 0, ...draggedIndices)
    onReorder(newOrder)

    setDraggedIndex(null)
    setDraggedGroupId(null)
    setDragOver(null)
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDraggedGroupId(null)
    setDragOver(null)
  }

  if (scenes.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-text-muted">
        Step2에서 이미지와 스크립트를 먼저 생성해주세요.
      </div>
    )
  }

  // store에서 그룹 정보 가져오기
  const sceneGroups: Array<{ sceneId: number; indices: number[] }> = []
  sceneStructureStore.groups.forEach((groupInfo, sceneId) => {
    sceneGroups.push({
      sceneId,
      indices: groupInfo.indices,
    })
  })

  return (
    <div className="space-y-3">
      {sceneGroups.map((group, groupIndex) => {
        const isGrouped = group.indices.length > 1
        const firstSceneIndex = group.indices[0]
        // 그룹의 첫 번째 씬 선택 (splitIndex가 없거나 0인 씬, 없으면 group.indices[0])
        const firstSceneIndexInGroup = group.indices.find(idx => scenes[idx] && !scenes[idx].splitIndex) ?? group.indices[0]
        // 씬 순서 번호 (1부터 시작)
        const sceneOrderNumber = groupIndex + 1
        
        return (
          <div 
            key={`group-${group.sceneId}`} 
            draggable={isGrouped}
            onDragStart={() => isGrouped && handleGroupDragStart(group.sceneId)}
            onDragOver={(e) => isGrouped && handleGroupDragOver(e, group.sceneId)}
            onDrop={isGrouped ? handleGroupDrop : undefined}
            onDragLeave={() => setDragOver(null)}
            onDragEnd={handleDragEnd}
            className={isGrouped ? 'space-y-1 rounded-lg p-2 cursor-pointer hover:opacity-90 transition-opacity bg-[#5e8790]/10 border border-[#5e8790]/30' : ''}
            onClick={(e) => {
              // 그룹화된 경우에만 클릭 이벤트 처리
              // 자식 요소(헤더, 씬 카드 등)를 클릭한 경우는 각각의 핸들러가 처리하므로 stopPropagation 호출
              // 그룹 컨테이너의 빈 공간(패딩 영역)을 클릭한 경우에만 선택
              if (isGrouped) {
                const target = e.target as HTMLElement
                // 클릭한 요소가 그룹 컨테이너 자체이거나, 클릭 가능한 자식 요소가 아닌 경우
                // (버튼, 텍스트 영역, 셀렉트, 드래그 가능한 요소가 아닌 경우)
                if (target === e.currentTarget || 
                    (!target.closest('button') && 
                     !target.closest('textarea') && 
                     !target.closest('select') &&
                     !target.closest('[draggable]') &&
                     !target.closest('.cursor-pointer'))) {
                  // 첫 번째 씬의 첫 번째 구간만 표시
                  const firstScene = scenes[firstSceneIndexInGroup]
                  if (firstScene) {
                    const scriptParts = firstScene.script.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
                    if (scriptParts.length > 1 && onSelectPart) {
                      // 구간이 나뉘어져 있으면 첫 번째 구간만 선택
                      onSelectPart(firstSceneIndexInGroup, 0)
                    } else {
                      // 구간이 없으면 첫 번째 씬 선택
                      onSelect(firstSceneIndexInGroup)
                    }
                  } else {
                    onSelect(firstSceneIndexInGroup)
                  }
                }
              }
            }}
          >
            {/* 그룹화된 경우 그룹 헤더에 사진, 전환 효과, 이미지 비율 표시 */}
            {isGrouped && (() => {
              return (
                <div 
                  className="relative mb-2 pb-2 border-b border-gray-200 cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(firstSceneIndexInGroup)
                  }}
                >
                  {/* 오른쪽 상단 버튼들 */}
                  <div className="absolute top-0 right-0 flex flex-col items-end gap-2 z-10">
                    {/* 삭제 버튼 */}
                    {onDeleteGroup && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('그룹의 모든 씬을 삭제하시겠습니까?')) {
                            onDeleteGroup(group.sceneId, group.indices)
                          }
                        }}
                        className="w-6 h-6 flex items-center justify-center transition-all hover:opacity-70"
                        title="그룹 삭제"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    
                    {/* 복사, 재생 버튼들 */}
                    <div className="flex items-center gap-2">
                      {onDuplicateGroup && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDuplicateGroup(group.sceneId, group.indices)
                          }}
                          className="w-8 h-7 rounded-lg bg-white border border-[#88a9ac] flex items-center justify-center hover:bg-gray-50 transition-all"
                          title="그룹 복사"
                        >
                          <Copy className="w-4 h-4 text-[#2c2c2c]" />
                        </button>
                      )}
                      {onPlayGroup && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (onPlayGroup) {
                              await onPlayGroup(group.sceneId, group.indices)
                            }
                          }}
                          disabled={isPreparing || isTtsBootstrapping}
                          className="w-8 h-7 rounded-lg bg-white border border-[#88a9ac] flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            isPreparing || isTtsBootstrapping
                              ? "준비 중..."
                              : playingGroupSceneId === group.sceneId
                              ? "그룹 정지"
                              : "그룹 재생"
                          }
                        >
                          {isPreparing || isTtsBootstrapping ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#2c2c2c]" />
                          ) : playingGroupSceneId === group.sceneId ? (
                            <Pause className="w-4 h-4 text-[#2c2c2c]" />
                          ) : (
                          <Play className="w-4 h-4 text-[#2c2c2c]" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                  {/* 드래그 핸들 */}
                  <GripVertical className="w-5 h-5 cursor-move text-text-tertiary shrink-0 mt-6" />
                  
                  {/* 썸네일 - 왼쪽 */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 shrink-0">
                    {sceneThumbnails[firstSceneIndex] && (() => {
                      const thumbnailUrl = sceneThumbnails[firstSceneIndex] as string
                      const validUrl = thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')
                        ? thumbnailUrl
                        : thumbnailUrl.startsWith('//')
                        ? `https:${thumbnailUrl}`
                        : thumbnailUrl.startsWith('/')
                        ? thumbnailUrl
                        : getScenePlaceholder(firstSceneIndex)
                      
                      return (
                        <Image
                          src={validUrl}
                          alt={`Scene ${firstSceneIndex + 1}`}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = getScenePlaceholder(firstSceneIndex)
                          }}
                        />
                      )
                    })()}
                  </div>
                  
                  {/* 오른쪽: Scene 번호와 전환 효과/이미지 비율 */}
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Scene 번호 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-dark">
                        Scene {sceneOrderNumber}
                      </span>
                    </div>
                    
                    {/* 이미지 비율 - 아래쪽 */}
                    <div className="flex items-center gap-2 text-xs flex-wrap justify-start">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#88a9ac] text-text-dark hover:bg-gray-50 transition-all font-bold tracking-[-0.14px] flex items-center gap-1"
                            style={{ 
                              fontSize: 'var(--font-size-12)',
                              lineHeight: 'var(--line-height-12-140)'
                            }}
                          >
                            {timeline?.scenes[firstSceneIndex]?.imageFit === 'cover' ? '꽉 채우기' : 
                             timeline?.scenes[firstSceneIndex]?.imageFit === 'fill' ? '늘려 채우기' : 
                             '비율 유지'}
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-40 p-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onImageFitChange(firstSceneIndex, 'cover')
                              }}
                              className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                                timeline?.scenes[firstSceneIndex]?.imageFit === 'cover' ? 'bg-gray-100 font-semibold' : ''
                              }`}
                            >
                              꽉 채우기
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onImageFitChange(firstSceneIndex, 'contain')
                              }}
                              className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                                timeline?.scenes[firstSceneIndex]?.imageFit === 'contain' ? 'bg-gray-100 font-semibold' : ''
                              }`}
                            >
                              비율 유지
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onImageFitChange(firstSceneIndex, 'fill')
                              }}
                              className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                                timeline?.scenes[firstSceneIndex]?.imageFit === 'fill' ? 'bg-gray-100 font-semibold' : ''
                              }`}
                            >
                              늘려 채우기
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
              )
            })()}
            
            {dragOver && draggedGroupId !== null && dragOver.index === firstSceneIndex && (
              <div className="h-0.5 bg-brand-teal rounded-full mb-2" />
            )}
            {group.indices.map((index, groupSceneIndex) => {
              const scene = scenes[index]
              if (!scene) return null
              // ||| 구분자로 분할된 구간 확인 (공백 유무와 관계없이 분할)
              const scriptParts = (scene.script || '').split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
              const hasDelimiters = scriptParts.length > 1
              // 그룹 내 씬의 순서 번호 (splitIndex가 있으면 사용, 없으면 그룹 내 인덱스 + 1)
              const groupSceneOrderNumber = scene.splitIndex || groupSceneIndex + 1
              
              // 현재 재생 중인 씬인지 확인
              const isPlaying = playingSceneIndex === index || (playingGroupSceneId !== null && playingGroupSceneId === scene.sceneId)
              
              return (
                <div key={hasDelimiters ? `${scene.sceneId}-delimiter-${index}` : (scene.splitIndex ? `${scene.sceneId}-${scene.splitIndex}` : scene.sceneId ?? index)}>
                  {dragOver && dragOver.index === index && dragOver.position === 'before' && (
                    <div className="h-0.5 bg-brand-teal rounded-full" />
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragLeave={() => setDragOver(null)}
                    onDragEnd={handleDragEnd}
                    className={`relative rounded-2xl p-4 transition-all cursor-pointer shadow-(--shadow-card-default) ${
                      isGrouped ? 'ml-6' : ''
                    } ${
                      draggedIndex === index
                        ? 'opacity-50'
                        : isPlaying
                          ? 'bg-[#5e8790]/20 shadow-lg shadow-[#5e8790]/30'
                          : currentSceneIndex === index
                            ? 'bg-[#5e8790]/40'
                            : isGrouped
                              ? 'bg-gray-50/80'
                              : 'bg-white/80'
                    }`}
                    onClick={(e) => {
                      // 버튼이나 입력 필드가 아닌 경우에만 씬 선택
                      const target = e.target as HTMLElement
                      if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA' && !target.closest('button') && !target.closest('textarea')) {
                        onSelect(index)
                      }
                    }}
                  >
                    {/* 삭제 버튼 - 오른쪽 상단 */}
                    {onDeleteScene && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('이 씬을 삭제하시겠습니까?')) {
                            onDeleteScene(index)
                          }
                        }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center transition-all z-10 hover:opacity-70"
                        title="씬 삭제"
                      >
                        <X className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                    <div className="flex items-center gap-4">
                      {/* 드래그 핸들 */}
                      <GripVertical className="w-5 h-5 cursor-move text-text-tertiary shrink-0" />
                      
                      {/* 썸네일 - 그룹화되지 않은 경우에만 표시 */}
                      {!isGrouped && (
                        <div className="w-[120px] h-[120px] rounded-lg overflow-hidden bg-bg-gray-placeholder shrink-0">
                          {sceneThumbnails[index] && (() => {
                            const thumbnailUrl = sceneThumbnails[index] as string
                            // URL 검증 및 수정
                            const validUrl = thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')
                              ? thumbnailUrl
                              : thumbnailUrl.startsWith('//')
                              ? `https:${thumbnailUrl}`
                              : thumbnailUrl.startsWith('/')
                              ? thumbnailUrl
                              : getScenePlaceholder(index)
                            
                            return (
                              <Image
                                src={validUrl}
                                alt={`Scene ${index + 1}`}
                                width={120}
                                height={120}
                                className="w-full h-full object-cover"
                                unoptimized
                                onError={(e) => {
                                  // 이미지 로드 실패 시 기본 placeholder 사용
                                  const target = e.target as HTMLImageElement
                                  target.src = getScenePlaceholder(index)
                                }}
                              />
                            )
                          })()}
                        </div>
                      )}

                      {/* 씬 정보 */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <p 
                            className="font-bold text-text-dark tracking-[-0.36px]"
                            style={{ 
                              fontSize: 'var(--font-size-18)',
                              lineHeight: 'var(--line-height-18-140)'
                            }}
                          >
                            {hasDelimiters
                              ? `Scene ${sceneOrderNumber} (${scriptParts.length}개 구간)`
                              : !isGrouped
                              ? `Scene ${sceneOrderNumber}`
                              : scene.splitIndex
                              ? `Scene ${sceneOrderNumber}-${groupSceneOrderNumber}`
                              : `Scene ${sceneOrderNumber}`}
                          </p>
                        </div>
                        
                        {/* 텍스트 입력 - ||| 구분자가 있으면 각 구간별로 카드 형태로 표시 */}
                {hasDelimiters ? (
                  <div className="space-y-2 mb-2">
                    {scriptParts.map((part, partIndex) => {
                      const isSelected = selectedPart?.sceneIndex === index && selectedPart?.partIndex === partIndex
                      // 현재 재생 중인 씬인지 확인
                      const isPartPlaying = isPlaying
                      return (
                      <div 
                        key={partIndex} 
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          isPartPlaying
                            ? 'border-[#5e8790] bg-[#5e8790]/20 shadow-lg shadow-[#5e8790]/30'
                            : isSelected
                              ? 'border-[#5e8790] bg-[#5e8790]/20'
                              : currentSceneIndex === index
                                ? 'border-[#5e8790] bg-[#5e8790]/10'
                                : 'border-gray-200 bg-white/80 hover:border-[#5e8790]'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onSelectPart) {
                            onSelectPart(index, partIndex)
                          } else {
                            onSelect(index)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-text-dark">
                            Scene {sceneOrderNumber}-{partIndex + 1}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {onDuplicateScene && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // 해당 구간을 새로운 구간으로 복사
                                  const newParts = [...scriptParts]
                                  newParts.splice(partIndex + 1, 0, part) // 다음 위치에 복사
                                  const newScript = newParts.join(' ||| ')
                                  onScriptChange(index, newScript)
                                }}
                                title="구간 복사"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            )}
                            {onDeleteScene && scriptParts.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // 해당 구간 삭제
                                  const newParts = [...scriptParts]
                                  newParts.splice(partIndex, 1)
                                  const newScript = newParts.join(' ||| ')
                                  onScriptChange(index, newScript)
                                }}
                                title="구간 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                            {onTtsPreview && part.trim() && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-6 w-6 p-0"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  // 해당 구간만 TTS 미리듣기
                                  const isCurrentlyPreviewing = previewingSceneIndex === index && previewingPartIndex === partIndex
                                  if (isCurrentlyPreviewing) {
                                    setPreviewingSceneIndex(null)
                                    setPreviewingPartIndex(null)
                                  } else {
                                    setPreviewingSceneIndex(index)
                                    setPreviewingPartIndex(partIndex)
                                    try {
                                      await onTtsPreview(index, partIndex)
                                    } catch (error) {
                                      console.error('TTS 미리듣기 실패:', error)
                                    } finally {
                                      setPreviewingSceneIndex(null)
                                      setPreviewingPartIndex(null)
                                    }
                                  }
                                }}
                                disabled={previewingSceneIndex === index && previewingPartIndex === partIndex}
                                title="구간 TTS 미리듣기"
                              >
                                {previewingSceneIndex === index && previewingPartIndex === partIndex ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={part}
                          onChange={(e) => {
                            // 해당 구간만 업데이트
                            const newParts = [...scriptParts]
                            newParts[partIndex] = e.target.value
                            const newScript = newParts.join(' ||| ')
                            onScriptChange(index, newScript)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full p-2 rounded-lg border resize-none bg-white border-gray-300 text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-teal tracking-[-0.28px] shadow-(--shadow-card-default)"
                          style={{ 
                            fontSize: 'var(--font-size-14)',
                            lineHeight: 'var(--line-height-14-140)'
                          }}
                          placeholder={`구간 ${partIndex + 1} 텍스트 입력...`}
                        />
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <textarea
                      value={scene.script.replace(/\s*\|\|\|\s*/g, ' ')}
                      onChange={(e) => {
                        // 사용자가 입력한 값에서 ||| 제거 (실수로 입력한 경우 방지)
                        const cleaned = e.target.value.replace(/\s*\|\|\|\s*/g, ' ')
                        // trim() 제거: 입력 중간의 공백(띄어쓰기)을 유지하기 위해
                        onScriptChange(index, cleaned)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 p-2 max-w-[520px] rounded-lg border resize-none bg-white border-gray-300 text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-teal tracking-[-0.28px] shadow-(--shadow-card-default)"
                      style={{ 
                        fontSize: 'var(--font-size-14)',
                        lineHeight: 'var(--line-height-14-140)',
                        height: '64px' // h-7(28px) + gap-2(8px) + h-7(28px) = 64px
                      }}
                      placeholder="Scene 텍스트 입력..."
                    />
                    {/* 오른쪽 버튼들 (세로 배치) */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {onDuplicateScene && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDuplicateScene(index)
                          }}
                          className="w-8 h-7 rounded-lg bg-white border border-[#88a9ac] flex items-center justify-center hover:bg-gray-50 transition-all"
                          title="씬 복사"
                        >
                          <Copy className="w-4 h-4 text-[#2c2c2c]" />
                        </button>
                      )}
                      {onPlayScene && !isGrouped && !hasDelimiters && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await onPlayScene(index)
                            } catch (error) {
                              console.error('씬 재생 실패:', error)
                            }
                          }}
                          disabled={isPreparing || isTtsBootstrapping}
                          className="w-8 h-7 rounded-lg bg-white border border-[#88a9ac] flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            isPreparing || isTtsBootstrapping
                              ? "준비 중..."
                              : playingSceneIndex === index
                              ? "씬 정지"
                              : "씬 재생"
                          }
                        >
                          {isPreparing || isTtsBootstrapping ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#2c2c2c]" />
                          ) : playingSceneIndex === index ? (
                            <Pause className="w-4 h-4 text-[#2c2c2c]" />
                          ) : (
                            <Play className="w-4 h-4 text-[#2c2c2c]" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 설정 - 분할된 씬이 아닌 경우에만 표시 (그룹이 아닐 때만 표시) */}
                {!isGrouped && !hasDelimiters && (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {onSplitScene && !hasDelimiters && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSplitScene(index)
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#88a9ac] text-text-dark hover:bg-gray-50 transition-all font-bold tracking-[-0.14px]"
                        style={{ 
                          fontSize: 'var(--font-size-12)',
                          lineHeight: 'var(--line-height-12-140)'
                        }}
                      >
                        자막 장면 분할
                      </button>
                    )}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-[#88a9ac] text-text-dark hover:bg-gray-50 transition-all font-bold tracking-[-0.14px] flex items-center gap-1"
                          style={{ 
                            fontSize: 'var(--font-size-12)',
                            lineHeight: 'var(--line-height-12-140)'
                          }}
                        >
                          {timeline?.scenes[index]?.imageFit === 'cover' ? '꽉 채우기' : 
                           timeline?.scenes[index]?.imageFit === 'fill' ? '늘려 채우기' : 
                           '비율 유지'}
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-40 p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onImageFitChange(index, 'cover')
                            }}
                            className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                              timeline?.scenes[index]?.imageFit === 'cover' ? 'bg-gray-100 font-semibold' : ''
                            }`}
                          >
                            꽉 채우기
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onImageFitChange(index, 'contain')
                            }}
                            className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                              timeline?.scenes[index]?.imageFit === 'contain' ? 'bg-gray-100 font-semibold' : ''
                            }`}
                          >
                            비율 유지
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onImageFitChange(index, 'fill')
                            }}
                            className={`px-3 py-2 text-left text-sm rounded-md hover:bg-gray-100 transition-colors ${
                              timeline?.scenes[index]?.imageFit === 'fill' ? 'bg-gray-100 font-semibold' : ''
                            }`}
                          >
                            늘려 채우기
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
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
            })}
          </div>
        )
      })}
    </div>
  )
}


