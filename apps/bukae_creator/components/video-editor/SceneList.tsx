import { useState } from 'react'
import { GripVertical } from 'lucide-react'
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
}: SceneListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<{ index: number; position: 'before' | 'after' } | null>(null)

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

  return (
    <div className="space-y-3">
      {scenes.map((scene, index) => (
        <div key={scene.sceneId ?? index}>
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
              draggedIndex === index
                ? 'opacity-50 border-purple-500'
                : currentSceneIndex === index
                  ? theme === 'dark'
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-purple-500 bg-purple-50'
                  : theme === 'dark'
                    ? 'border-gray-700 bg-gray-900 hover:border-purple-500'
                    : 'border-gray-200 bg-white hover:border-purple-500'
            }`}
            onClick={() => onSelect(index)}
          >
            <div className="flex gap-3">
              {/* 썸네일 */}
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
                    <img
                      src={validUrl}
                      alt={`Scene ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // 이미지 로드 실패 시 기본 placeholder 사용
                        const target = e.target as HTMLImageElement
                        target.src = `https://via.placeholder.com/200x200/a78bfa/ffffff?text=Scene${index + 1}`
                      }}
                    />
                  )
                })()}
              </div>

              {/* 씬 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className={`w-5 h-5 cursor-move ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                    >
                      씬 {index + 1}
                    </span>
                  </div>
                </div>

                {/* 텍스트 입력 */}
                <textarea
                  rows={2}
                  value={scene.script}
                  onChange={(e) => onScriptChange(index, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-sm rounded-md border px-2 py-1 resize-none mb-2"
                  style={{
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                    color: theme === 'dark' ? '#ffffff' : '#111827',
                  }}
                  placeholder="씬 텍스트 입력..."
                />

                {/* 설정 */}
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span
                    className="px-2 py-1 rounded border text-xs"
                    style={{
                      backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
                      borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                      color: theme === 'dark' ? '#9ca3af' : '#6b7280',
                    }}
                  >
                    {transitionLabels[timeline?.scenes[index]?.transition || 'fade'] || '페이드'}
                  </span>
                  <select
                    value={timeline?.scenes[index]?.imageFit || 'fill'}
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
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          {dragOver && dragOver.index === index && dragOver.position === 'after' && (
            <div className="h-0.5 bg-blue-500 rounded-full" />
          )}
        </div>
      ))}
    </div>
  )
}


