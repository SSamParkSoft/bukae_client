'use client'

import { memo } from 'react'
import { GripVertical } from 'lucide-react'
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
  /** 촬영가이드 텍스트 */
  guideText?: string
  onGuideChange?: (value: string) => void
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
  guideText = '',
  onGuideChange,
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

      <div className="flex gap-4 items-start">
        {/* 좌측: 드래그 핸들 - 중앙 정렬 */}
        {onDragStart && (
          <div className="flex items-center shrink-0" style={{ height: '330px' }}>
            <div
              className="cursor-move text-text-tertiary shrink-0 touch-none"
              aria-hidden
            >
              <GripVertical className="w-6 h-6" />
            </div>
          </div>
        )}

        {/* 메인 컨텐츠 영역: 영상 업로드 | 스크립트+타임라인 */}
        <div className="flex-1 min-w-0 flex gap-4" style={{ height: '330px' }}>
          {/* 좌측: 영상 업로드 영역 */}
          <div className="shrink-0">
            <ProVideoUpload onUpload={onVideoUpload} />
          </div>

          {/* 우측: 스크립트 + 타임라인 영역 */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* 상단 영역: SCENE 라벨 + 스크립트/가이드 버튼들 */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* SCENE 라벨 */}
              <div className="flex items-center mb-4">
                <p
                  className="text-brand-teal tracking-[-0.36px]"
                  style={{
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px',
                    fontFamily: '"Zeroes Two", sans-serif',
                    fontWeight: 400,
                  }}
                >
                  SCENE {sceneIndex}
                </p>
              </div>

              {/* 스크립트 영역 */}
              <div className="flex-1 min-w-0 flex gap-4 mb-4">
                {/* 중앙: 스크립트 영역 */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {/* 스크립트 텍스트 영역 - 버튼이 textarea 내부에 위치 */}
                  <div className="relative rounded-lg bg-white shadow-md overflow-hidden border-2 border-transparent" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 스크립트 버튼 - textarea 내부 왼쪽 상단 */}
                    {onAiScriptClick && (
                      <Button
                        type="button"
                        onClick={onAiScriptClick}
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold flex items-center gap-4"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 스크립트
                      </Button>
                    )}
                    {/* 스크립트 텍스트 영역 */}
                    <textarea
                      value={scriptText}
                      onChange={(e) => onScriptChange(e.target.value)}
                      placeholder="스크립트를 입력하세요."
                      rows={2}
                      className="w-full p-3 rounded-lg bg-transparent text-text-tertiary placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0"
                      style={{
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '25.2px',
                        fontWeight: 500,
                        letterSpacing: '-0.14px',
                        paddingLeft: onAiScriptClick ? 'calc(12px + 73px + 16px)' : '12px', // left-3(12px) + 버튼너비(73px) + 간격(16px)
                        paddingTop: onAiScriptClick ? '12px' : '12px', // 버튼과 같은 높이에서 시작
                        minHeight: '74px',
                      }}
                    />
                  </div>
                </div>

                {/* 우측: 촬영가이드 영역 */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  {/* 촬영가이드 텍스트 영역 - 버튼이 textarea 내부에 위치 */}
                  <div className="relative rounded-lg bg-white/10 backdrop-blur-md shadow-md overflow-hidden border-2 border-white" style={{ minHeight: '74px', boxSizing: 'border-box' }}>
                    {/* AI 촬영가이드 버튼 - textarea 내부 왼쪽 상단 */}
                    {onAiGuideClick && (
                      <Button
                        type="button"
                        onClick={onAiGuideClick}
                        className="absolute left-3 top-3 z-10 h-[25px] px-3 bg-brand-teal hover:bg-brand-teal-dark text-white rounded-2xl font-bold flex items-center gap-4"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16.8px',
                        }}
                      >
                        AI 촬영가이드
                      </Button>
                    )}
                    {/* 촬영가이드 텍스트 영역 */}
                    <textarea
                      value={guideText}
                      onChange={(e) => onGuideChange?.(e.target.value)}
                      placeholder="촬영가이드를 입력하세요."
                      rows={2}
                      className="w-full p-3 rounded-lg bg-transparent text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-0 resize-none border-0"
                      style={{
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '25.2px',
                        fontWeight: 500,
                        letterSpacing: '-0.14px',
                        paddingLeft: onAiGuideClick ? 'calc(12px + 83px + 16px)' : '12px', // left-3(12px) + 버튼너비(83px) + 간격(16px)
                        paddingTop: onAiGuideClick ? '12px' : '12px', // 버튼과 같은 높이에서 시작
                        minHeight: '74px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 하단: 타임라인 비주얼 */}
            <div className="relative">
              {/* 시간 마커 */}
              <div className="flex mb-2 overflow-x-auto pb-1 scrollbar-hide">
                {timeMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="shrink-0 flex flex-col items-center relative border-r border-[#a6a6a6]"
                    style={{ width: '74px' }}
                  >
                    {/* 상단 세로선 */}
                    <div className="w-px h-[10px] bg-[#a6a6a6] mb-1" />
                    {/* 시간 텍스트 */}
                    <span
                      className="text-text-tertiary font-medium"
                      style={{
                        fontSize: '16px',
                        lineHeight: '22.4px',
                        letterSpacing: '-0.32px',
                      }}
                    >
                      {marker}
                    </span>
                  </div>
                ))}
              </div>

              {/* 격자 편집 타임라인 */}
              <div className="relative h-[84px] bg-white rounded-2xl border border-gray-300 overflow-hidden">
                {/* 격자 패턴 - 각 74px 너비의 프레임들 */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(ttsDuration || 10) }).map((_, idx) => (
                    <div
                      key={idx}
                      className="shrink-0 relative border-r border-[#a6a6a6]"
                      style={{ width: '74px', height: '100%' }}
                    >
                      {/* 배경 이미지/비디오 썸네일 영역 (Figma에서는 이미지로 표시) */}
                      <div className="absolute inset-0 bg-[#111111] opacity-40" />
                    </div>
                  ))}
                </div>
                
                {/* 선택 영역 표시 (Figma의 Rectangle 212, 213) - 3.5초부터 8.5초까지 */}
                <div className="absolute left-[258px] top-0 w-[372px] h-full border-l-2 border-r-2 border-[#2c2c2c] rounded-2xl" />
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
