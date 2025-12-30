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
  theme: string | undefined
  onSelect: (index: number) => void
  onScriptChange: (index: number, value: string) => void
  onImageFitChange: (index: number, fit: 'cover' | 'contain' | 'fill') => void
  onReorder: (newOrder: number[]) => void
  transitionLabels: Record<string, string>
  onSplitScene?: (index: number) => void
  onDeleteScene?: (index: number) => void
  onDuplicateScene?: (index: number) => void
  onTtsPreview?: (sceneIndex: number) => Promise<void>
}

export function SceneList({
  scenes,
  timeline,
  sceneThumbnails,
  currentSceneIndex,
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
}: SceneListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)
  const [previewingSceneIndex, setPreviewingSceneIndex] = useState<number | null>(null)

  // 드래그 시작
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  // 드롭 위치 계산
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetY = event.clientY - rect.top
    const position: 'before' | 'after' = offsetY < rect.height / 2 ? 'before' : 'after'
    setDragOver({ index, position })
  }

  // 드롭
  const handleDrop = (event?: React.DragEvent<HTMLDivElement>) => {
    event?.preventDefault()
    if (draggedIndex === null || !dragOver) return

    const newOrder = scenes.map((_, idx) => idx)
    const [removed] = newOrder.splice(draggedIndex, 1)

    let targetIndex = dragOver.position === 'after' ? dragOver.index + 1 : dragOver.index
    if (draggedIndex < targetIndex) {
      targetIndex -= 1
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
        
        return (
          <div 
            key={`group-${group.sceneId}`} 
            className={isGrouped ? `space-y-1 rounded-lg p-2 ${
              theme === 'dark' 
                ? 'bg-gray-800/30 border border-gray-700' 
                : 'bg-purple-50/50 border border-purple-200'
            }` : ''}
          >
            {/* 그룹화된 경우 그룹 헤더에 사진, 전환 효과, 이미지 비율 표시 */}
            {isGrouped && (
              <div className="mb-2 pb-2 border-b" style={{
                borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
              }}>
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
            )}
            
            {group.indices.map((index) => {
              const scene = scenes[index]
              const isSplitScene = !!scene.splitIndex
              
              return (
                <div key={scene.splitIndex ? `${scene.sceneId}-${scene.splitIndex}` : scene.sceneId ?? index}>
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
                    className={`rounded-lg border p-3 transition-all ${
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
                    onClick={() => onSelect(index)}
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
                              {scene.splitIndex
                                ? `Scene ${scene.sceneId}-${scene.splitIndex}`
                                : `Scene ${scene.sceneId}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {onSplitScene && !scene.splitIndex && (
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
                    {onDuplicateScene && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="text-[11px] px-2 py-0 h-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDuplicateScene(index)
                        }}
                        title="Scene 복사"
                      >
                        <Copy className="w-3 h-3" />
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

                {/* 텍스트 입력 */}
                <div className="flex items-start gap-2 mb-2">
                  <textarea
                    rows={2}
                    value={scene.script}
                    onChange={(e) => onScriptChange(index, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm rounded-md border px-2 py-1 resize-none"
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
                      variant="outline"
                      size="xs"
                      className="shrink-0 h-auto py-1 px-2"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (previewingSceneIndex === index) {
                          // 재생 중이면 정지 (추후 구현)
                          setPreviewingSceneIndex(null)
                        } else {
                          setPreviewingSceneIndex(index)
                          try {
                            await onTtsPreview(index)
                          } catch (error) {
                            console.error('TTS 미리듣기 실패:', error)
                          } finally {
                            setPreviewingSceneIndex(null)
                          }
                        }
                      }}
                      disabled={previewingSceneIndex === index}
                      title="TTS 미리듣기"
                    >
                      {previewingSceneIndex === index ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>

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


