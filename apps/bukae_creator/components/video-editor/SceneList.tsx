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
  transitionLabels,
}: SceneListProps) {
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
      {scenes.map((scene, index) => {
        const isActive = currentSceneIndex === index
        const sceneData = timeline?.scenes[index]

        return (
          <div
            key={scene.sceneId ?? index}
            className="rounded-lg border p-3 cursor-pointer transition-colors"
            style={{
              borderColor: isActive
                ? '#8b5cf6'
                : theme === 'dark'
                  ? '#374151'
                  : '#e5e7eb',
              backgroundColor: isActive
                ? theme === 'dark'
                  ? '#3b1f5f'
                  : '#f3e8ff'
                : theme === 'dark'
                  ? '#1f2937'
                  : '#ffffff',
            }}
            onClick={() => onSelect(index)}
          >
            <div className="flex gap-3">
              {/* 썸네일 */}
              <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-200 shrink-0">
                {sceneThumbnails[index] && (
                  <img
                    src={sceneThumbnails[index] as string}
                    alt={`Scene ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* 씬 정보 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GripVertical
                      className="w-4 h-4"
                      style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    />
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
                    {transitionLabels[sceneData?.transition || 'fade'] || '페이드'}
                  </span>
                  <select
                    value={sceneData?.imageFit || 'fill'}
                    onChange={(e) => onImageFitChange(index, e.target.value as 'cover' | 'contain' | 'fill')}
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
        )
      })}
    </div>
  )
}

