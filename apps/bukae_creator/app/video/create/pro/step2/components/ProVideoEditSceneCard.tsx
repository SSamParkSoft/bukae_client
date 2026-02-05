'use client'

import { memo } from 'react'
import Image from 'next/image'
import { GripVertical, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProVideoUpload } from './ProVideoUpload'

export interface ProVideoEditSceneCardProps {
  sceneIndex: number
  scriptText: string
  onScriptChange: (value: string) => void
  onVideoUpload?: () => void
  onAiScriptClick?: () => void
  onAiGuideClick?: () => void
  /** TTS duration (초) - 타임라인 표시용 */
  ttsDuration?: number
  /** 드래그 핸들 관련 props */
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  draggedIndex?: number | null
  dragOver?: { index: number; position: 'before' | 'after' } | null
}

export const ProVideoEditSceneCard = memo(function ProVideoEditSceneCard({
  sceneIndex,
  scriptText,
  onScriptChange,
  onVideoUpload,
  onAiScriptClick,
  onAiGuideClick,
  ttsDuration = 0,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedIndex = null,
  dragOver: dragOverProp = null,
}: ProVideoEditSceneCardProps) {
  const isDragging = draggedIndex !== null && draggedIndex === sceneIndex - 1
  const isDropTargetBefore = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'after'

  // 타임라인 시간 마커 생성 (1초 단위)
  const generateTimeMarkers = () => {
    const duration = Math.ceil(ttsDuration || 10) // 최소 10초, TTS duration이 있으면 그만큼
    const markers = []
    for (let i = 0; i <= duration; i++) {
      const minutes = Math.floor(i / 60)
      const seconds = i % 60
      markers.push(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }
    return markers
  }

  const timeMarkers = generateTimeMarkers()

  return (
    <div
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`rounded-2xl border border-white/10 p-6 shadow-(--shadow-card-default) transition-all ${
        isDragging ? 'opacity-50' : 'bg-white/80'
      }`}
    >
      {isDropTargetBefore && (
        <div className="h-0.5 bg-brand-teal rounded-full -mt-3 mb-3" aria-hidden />
      )}

      <div className="flex gap-6">
        {/* 좌측: 드래그 핸들 */}
        {onDragStart && (
          <div className="flex items-start shrink-0">
            <div
              className="cursor-move text-text-tertiary shrink-0 touch-none self-center"
              aria-hidden
            >
              <GripVertical className="w-5 h-5" />
            </div>
          </div>
        )}

        {/* SCENE 라벨 */}
        <div className="flex items-start shrink-0">
          <p
            className="text-brand-teal tracking-[-0.36px]"
            style={{
              fontSize: 'var(--font-size-18)',
              lineHeight: 'var(--line-height-18-140)',
              fontFamily: '"Zeroes Two", sans-serif',
              fontWeight: 400,
            }}
          >
            SCENE {sceneIndex}
          </p>
        </div>

        {/* 메인 컨텐츠 영역: 영상 업로드 | 스크립트 | 타임라인 */}
        <div className="flex-1 min-w-0 flex gap-6">
          {/* 좌측: 영상 업로드 영역 */}
          <div className="shrink-0">
            <ProVideoUpload onUpload={onVideoUpload} />
          </div>

          {/* 중앙: 스크립트 영역 */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* AI 스크립트 버튼 */}
            {onAiScriptClick && (
              <Button
                type="button"
                onClick={onAiScriptClick}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-[#BBC9C9] bg-white hover:bg-[#e4eeed] text-text-tertiary"
              >
                AI 스크립트
              </Button>
            )}

            {/* 스크립트 텍스트 영역 */}
            <textarea
              value={scriptText}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder="스크립트를 입력하세요."
              rows={4}
              className="w-full p-3 rounded-lg bg-white text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent resize-none shadow-(--shadow-card-default)"
              style={{
                fontSize: 'var(--font-size-14)',
                lineHeight: 'var(--line-height-14-140)',
              }}
            />
          </div>

          {/* 우측: 타임라인 편집 영역 */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* AI 촬영가이드 버튼 */}
            {onAiGuideClick && (
              <Button
                type="button"
                onClick={onAiGuideClick}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-[#BBC9C9] bg-white hover:bg-[#e4eeed] text-text-tertiary"
              >
                <Cloud className="w-4 h-4" />
                AI 촬영가이드
              </Button>
            )}

            {/* 템플릿 가이드 제목 */}
            <div>
              <p
                className="font-semibold text-text-dark tracking-[-0.32px]"
                style={{
                  fontSize: 'var(--font-size-16)',
                  lineHeight: 'var(--line-height-16-140)',
                }}
              >
                템플릿 가이드
              </p>
            </div>

              {/* 타임라인 비주얼 */}
            <div className="relative bg-gray-50 rounded-lg p-4 border border-gray-200">
              {/* 시간 마커 */}
              <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
                {timeMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 text-xs text-text-tertiary text-center"
                    style={{ minWidth: '48px', fontSize: '10px' }}
                  >
                    {marker}
                  </div>
                ))}
              </div>

              {/* 격자 편집 타임라인 */}
              <div className="relative h-20 bg-white rounded border border-gray-300 overflow-hidden">
                {/* 격자 패턴 (chevron/zigzag 패턴) */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(ttsDuration || 10) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 border-r border-gray-200 relative"
                      style={{ minWidth: '48px' }}
                    >
                      {/* 격자 패턴 - 작은 삼각형/chevron 형태 반복 */}
                      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                        <svg
                          width="100%"
                          height="100%"
                          className="opacity-40"
                          preserveAspectRatio="none"
                          style={{ minWidth: '48px' }}
                        >
                          {/* 작은 chevron 패턴을 여러 개 반복 */}
                          {Array.from({ length: 3 }).map((_, patternIdx) => (
                            <path
                              key={patternIdx}
                              d={`M ${patternIdx * 16} 50% L ${patternIdx * 16 + 8} 20% L ${patternIdx * 16 + 16} 50% L ${patternIdx * 16 + 8} 80% Z`}
                              stroke="#88a9ac"
                              strokeWidth="0.5"
                              fill="#88a9ac"
                              fillOpacity="0.2"
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDropTargetAfter && (
        <div className="h-0.5 bg-brand-teal rounded-full mt-3 -mb-3" aria-hidden />
      )}
    </div>
  )
})
