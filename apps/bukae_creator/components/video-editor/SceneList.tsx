import { useState } from 'react'
import Image from 'next/image'
import { GripVertical, Copy, Trash2, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TimelineData, SceneScript } from '@/store/useVideoCreateStore'

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
}

export function SceneList({
  scenes,
  timeline,
  sceneThumbnails,
  currentSceneIndex,
  selectedPart,
  theme,
  onSelect,
  onScriptChange,
  onImageFitChange,
  onReorder,
  transitionLabels,
  onSplitScene,
  onDeleteScene,
  onDuplicateScene,
  onTtsPreview,
  onSelectPart,
  onPlayScene,
}: SceneListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [previewingSceneIndex, setPreviewingSceneIndex] = useState<number | null>(null)
  const [previewingPartIndex, setPreviewingPartIndex] = useState<number | null>(null)

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // 드롭 위치 계산
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    
    if (draggedIndex === null) return
    
    const draggedScene = scenes[draggedIndex]
    const targetScene = scenes[index]
    
    // 같은 sceneId를 가진 씬들 찾기 (같은 그룹)
    const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedScene.sceneId)
    
    // 그룹화된 씬은 같은 그룹 내에서만 이동 가능
    if (draggedGroupScenes.length > 1 && draggedScene.sceneId !== targetScene.sceneId) {
      // 다른 그룹으로 드래그하면 드롭 위치 표시 안 함
      return
    }
    
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }

  // 드롭
  const handleDrop = (event?: React.DragEvent<HTMLDivElement>) => {
    event?.preventDefault()
    if (draggedIndex === null || !dragOver) return

    const draggedScene = scenes[draggedIndex]
    const targetScene = scenes[dragOver.index]
    
    // 같은 sceneId를 가진 씬들 찾기 (같은 그룹)
    const draggedGroupScenes = scenes.filter(s => s.sceneId === draggedScene.sceneId)
    
    // 그룹화된 씬은 같은 그룹 내에서만 이동 가능
    if (draggedGroupScenes.length > 1 && draggedScene.sceneId !== targetScene.sceneId) {
      // 다른 그룹으로 드롭하려고 하면 무시
      setDraggedIndex(null)
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
        setDragOver(null)
        return
      }
    }

    newOrder.splice(targetIndex, 0, removed)
    onReorder(newOrder)

    setDraggedIndex(null)
    setDragOver(null)
  }

  // 드래그 종료
  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOver(null)
  }

  if (scenes.length === 0) {
    return (
      <div
        className="text-center py-8 text-sm"
        style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
      >
        Step3에서 이미지와 스크립트를 먼저 생성해주세요.
      </div>
    )
  }

  // 같은 sceneId를 가진 씬들을 그룹화
  const sceneGroups: Array<{ sceneId: number; indices: number[] }> = []
  const sceneIdToGroupIndex = new Map<number, number>()
  
  scenes.forEach((scene, index) => {
    const sceneId = scene.sceneId
    if (!sceneIdToGroupIndex.has(sceneId)) {
      sceneIdToGroupIndex.set(sceneId, sceneGroups.length)
      sceneGroups.push({ sceneId, indices: [index] })
    } else {
      const groupIndex = sceneIdToGroupIndex.get(sceneId)!
      sceneGroups[groupIndex].indices.push(index)
    }
  })

  // 각 그룹 내에서 splitIndex 순서로 정렬
  sceneGroups.forEach(group => {
    group.indices.sort((a, b) => {
      const aSplitIndex = scenes[a].splitIndex || 0
      const bSplitIndex = scenes[b].splitIndex || 0
      return aSplitIndex - bSplitIndex
    })
  })

  return (
    <div className="space-y-3">
      {sceneGroups.map((group) => {
        const isGrouped = group.indices.length > 1
        const firstSceneIndex = group.indices[0]
        // 그룹의 첫 번째 씬 선택 (splitIndex가 없거나 0인 씬, 없으면 group.indices[0])
        const firstSceneIndexInGroup = group.indices.find(idx => !scenes[idx].splitIndex) ?? group.indices[0]
        
        return (
          <div 
            key={`group-${group.sceneId}`} 
            className={isGrouped ? `space-y-1 rounded-lg p-2 cursor-pointer hover:opacity-90 transition-opacity ${
              theme === 'dark' 
                ? 'bg-gray-800/30 border border-gray-700' 
                : 'bg-purple-50/50 border border-purple-200'
            }` : ''}
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
                  className="mb-2 pb-2 border-b cursor-pointer hover:opacity-80 transition-opacity" 
                  style={{
                    borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(firstSceneIndexInGroup)
                  }}
                >
                  <div className="flex items-start gap-3">
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
                        : `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${firstSceneIndex + 1}`
                      
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
                            target.src = `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${firstSceneIndex + 1}`
                          }}
                        />
                      )
                    })()}
                  </div>
                  
                  {/* 오른쪽: Scene 번호와 전환 효과/이미지 비율 */}
                  <div className="flex flex-col gap-2 flex-1">
                    {/* Scene 번호 - 위쪽 */}
                    <span
                      className="text-sm font-semibold"
                      style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                    >
                      Scene {group.sceneId}
                    </span>
                    
                    {/* 전환 효과 및 이미지 비율 - 아래쪽 */}
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span
                        className="px-2 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                        }}
                      >
                        {transitionLabels[timeline?.scenes[firstSceneIndex]?.transition || 'none'] || '없음'}
                      </span>
                      <select
                        value={timeline?.scenes[firstSceneIndex]?.imageFit || 'contain'}
                        onChange={(e) => onImageFitChange(firstSceneIndex, e.target.value as 'cover' | 'contain' | 'fill')}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded border text-xs"
                        style={{
                          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#ffffff' : '#111827',
                        }}
                      >
                        <option value="cover">꽉 채우기</option>
                        <option value="contain">비율 유지</option>
                        <option value="fill">늘려 채우기</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              )
            })()}
            
            {group.indices.map((index) => {
              const scene = scenes[index]
              // ||| 구분자로 분할된 구간 확인 (공백 유무와 관계없이 분할)
              const scriptParts = scene.script.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
              const hasDelimiters = scriptParts.length > 1
              const isSplitScene = hasDelimiters || !!scene.splitIndex
              
              return (
                <div key={hasDelimiters ? `${scene.sceneId}-delimiter-${index}` : (scene.splitIndex ? `${scene.sceneId}-${scene.splitIndex}` : scene.sceneId ?? index)}>
                  {dragOver && dragOver.index === index && dragOver.position === 'before' && (
                    <div className="h-0.5 bg-blue-500 rounded-full" />
                  )}
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={handleDrop}
                    onDragLeave={() => setDragOver(null)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-lg border p-3 transition-all cursor-pointer ${
                      isGrouped ? 'ml-6 border-l-2 border-l-purple-400' : ''
                    } ${
                      draggedIndex === index
                        ? 'opacity-50 border-purple-500'
                        : currentSceneIndex === index
                          ? theme === 'dark'
                            ? 'border-purple-500 bg-purple-900/20'
                            : 'border-purple-500 bg-purple-50'
                          : theme === 'dark'
                            ? isGrouped
                              ? 'border-gray-600 bg-gray-800/50 hover:border-purple-500'
                              : 'border-gray-700 bg-gray-900 hover:border-purple-500'
                            : isGrouped
                              ? 'border-gray-300 bg-gray-50 hover:border-purple-500'
                              : 'border-gray-200 bg-white hover:border-purple-500'
                    }`}
                    onClick={(e) => {
                      // 버튼이나 입력 필드가 아닌 경우에만 씬 선택
                      const target = e.target as HTMLElement
                      if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA' && !target.closest('button') && !target.closest('textarea')) {
                        onSelect(index)
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      {/* 썸네일 - 그룹화되지 않은 경우에만 표시 */}
                      {!isGrouped && (
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 shrink-0">
                          {sceneThumbnails[index] && (() => {
                            const thumbnailUrl = sceneThumbnails[index] as string
                            // URL 검증 및 수정
                            const validUrl = thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')
                              ? thumbnailUrl
                              : thumbnailUrl.startsWith('//')
                              ? `https:${thumbnailUrl}`
                              : thumbnailUrl.startsWith('/')
                              ? thumbnailUrl
                              : `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${index + 1}`
                            
                            return (
                              <Image
                                src={validUrl}
                                alt={`Scene ${index + 1}`}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                unoptimized
                                onError={(e) => {
                                  // 이미지 로드 실패 시 기본 placeholder 사용
                                  const target = e.target as HTMLImageElement
                                  target.src = `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${index + 1}`
                                }}
                              />
                            )
                          })()}
                        </div>
                      )}

                      {/* 씬 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical
                              className={`w-5 h-5 cursor-move ${
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            />
                            <span
                              className="text-sm font-semibold"
                              style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                            >
                              {hasDelimiters
                                ? `Scene ${scene.sceneId} (${scriptParts.length}개 구간)`
                                : scene.splitIndex
                                ? `Scene ${scene.sceneId}-${scene.splitIndex}`
                                : `Scene ${scene.sceneId}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {onSplitScene && !hasDelimiters && !scene.splitIndex && (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="text-[11px] px-2 py-0 h-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onSplitScene(index)
                                }}
                              >
                                자막 씬 분할
                              </Button>
                            )}
                    {onDuplicateScene && isGrouped && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[11px] px-2 py-0 h-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateScene(index)
                        }}
                        title="Scene 복사 (같은 그룹 내에서만 가능)"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    {/* 씬 복사 버튼 - 항상 표시 */}
                    {onDuplicateScene && !isGrouped && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[11px] px-2 py-0 h-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateScene(index)
                        }}
                        title="씬 복사"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    {/* 전체 씬 재생 버튼 - 항상 표시 */}
                    {onPlayScene && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[11px] px-2 py-0 h-6"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            await onPlayScene(index)
                          } catch (error) {
                            console.error('씬 재생 실패:', error)
                          }
                        }}
                        title="씬 재생"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                    )}
                    {onDeleteScene && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[11px] px-2 py-0 h-6 text-red-500 hover:text-red-600 hover:border-red-500"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('이 씬을 삭제하시겠습니까?')) {
                            onDeleteScene(index)
                          }
                        }}
                        title="Scene 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 텍스트 입력 - ||| 구분자가 있으면 각 구간별로 카드 형태로 표시 */}
                {hasDelimiters ? (
                  <div className="space-y-2 mb-2">
                    {scriptParts.map((part, partIndex) => {
                      const isSelected = selectedPart?.sceneIndex === index && selectedPart?.partIndex === partIndex
                      return (
                      <div 
                        key={partIndex} 
                        className={`rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected
                            ? theme === 'dark'
                              ? 'border-purple-400 bg-purple-800/40'
                              : 'border-purple-400 bg-purple-100'
                            : currentSceneIndex === index
                              ? theme === 'dark'
                                ? 'border-purple-500 bg-purple-900/20'
                                : 'border-purple-500 bg-purple-50'
                              : theme === 'dark'
                                ? 'border-gray-600 bg-gray-800/50 hover:border-purple-500'
                                : 'border-gray-200 bg-white hover:border-purple-500'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          console.log(`[SceneList] 구간 클릭 | 씬 ${index}, 구간 ${partIndex}, 총 구간 수: ${scriptParts.length}`)
                          if (onSelectPart) {
                            console.log(`[SceneList] onSelectPart 호출 | 씬 ${index}, 구간 ${partIndex}`)
                            onSelectPart(index, partIndex)
                          } else {
                            console.log(`[SceneList] onSelectPart가 없어서 onSelect 호출 | 씬 ${index}`)
                            onSelect(index)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-xs font-semibold"
                            style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                          >
                            Scene {scene.sceneId}-{partIndex + 1}
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
                          rows={2}
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
                          className="w-full text-sm rounded-md border px-2 py-1 resize-none mt-2"
                          style={{
                            backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                            color: theme === 'dark' ? '#ffffff' : '#111827',
                          }}
                          placeholder={`구간 ${partIndex + 1} 텍스트 입력...`}
                        />
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 relative">
                      <textarea
                        rows={2}
                        value={scene.script.replace(/\s*\|\|\|\s*/g, ' ')}
                        onChange={(e) => {
                          // 사용자가 입력한 값에서 ||| 제거 (실수로 입력한 경우 방지)
                          const cleaned = e.target.value.replace(/\s*\|\|\|\s*/g, ' ')
                          onScriptChange(index, cleaned.trim())
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm rounded-md border px-2 py-1 pr-8 resize-none"
                        style={{
                          backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                          borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                          color: theme === 'dark' ? '#ffffff' : '#111827',
                        }}
                        placeholder="Scene 텍스트 입력..."
                      />
                      {onTtsPreview && scene.script.trim() && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="absolute right-2 top-2 h-6 w-6 p-0 z-10"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (previewingSceneIndex === index && previewingPartIndex === null) {
                              // 재생 중이면 정지
                              setPreviewingSceneIndex(null)
                              setPreviewingPartIndex(null)
                            } else {
                              setPreviewingSceneIndex(index)
                              setPreviewingPartIndex(null) // 전체 재생
                              try {
                                await onTtsPreview(index)
                              } catch (error) {
                                console.error('TTS 미리듣기 실패:', error)
                              } finally {
                                setPreviewingSceneIndex(null)
                                setPreviewingPartIndex(null)
                              }
                            }
                          }}
                          disabled={previewingSceneIndex === index && previewingPartIndex === null}
                          title="전체 씬 TTS 미리듣기"
                        >
                          {previewingSceneIndex === index && previewingPartIndex === null ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 설정 - 분할된 씬이 아닌 경우에만 표시 */}
                {!isSplitScene && (
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span
                      className="px-2 py-1 rounded border text-xs"
                      style={{
                        backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
                        borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                        color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                      }}
                    >
                      {transitionLabels[timeline?.scenes[index]?.transition || 'none'] || '없음'}
                    </span>
                    <select
                      value={timeline?.scenes[index]?.imageFit || 'contain'}
                      onChange={(e) => onImageFitChange(index, e.target.value as 'cover' | 'contain' | 'fill')}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 rounded border text-xs"
                      style={{
                        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                        borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                        color: theme === 'dark' ? '#ffffff' : '#111827',
                      }}
                    >
                      <option value="cover">꽉 채우기</option>
                      <option value="contain">비율 유지</option>
                      <option value="fill">늘려 채우기</option>
                    </select>
                  </div>
                )}
                      </div>
                    </div>
                  </div>
                  {dragOver && dragOver.index === index && dragOver.position === 'after' && (
                    <div className="h-0.5 bg-blue-500 rounded-full" />
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


