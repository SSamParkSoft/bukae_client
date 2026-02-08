'use client'

import { memo, useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { GripVertical, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authStorage } from '@/lib/api/auth-storage'

export interface ProSceneCardProps {
  sceneIndex: number
  scriptText: string
  onScriptChange: (value: string) => void
  voiceLabel?: string
  voiceTemplate?: string | null
  onVoiceClick?: () => void
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragEnd?: () => void
  isGenerating?: boolean
  /** 드래그 중인 카드 index (같으면 opacity 적용) */
  draggedIndex?: number | null
  /** 드롭 타깃 정보 (드롭 인디케이터 표시용) */
  dragOver?: { index: number; position: 'before' | 'after' } | null
}

export const ProSceneCard = memo(function ProSceneCard({
  sceneIndex,
  scriptText,
  onScriptChange,
  voiceLabel,
  voiceTemplate,
  onVoiceClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isGenerating = false,
  draggedIndex = null,
  dragOver: dragOverProp = null,
}: ProSceneCardProps) {
  const isDragging = draggedIndex !== null && draggedIndex === sceneIndex - 1
  const isDropTargetBefore = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'before'
  const isDropTargetAfter = dragOverProp?.index === sceneIndex - 1 && dragOverProp?.position === 'after'
  const isVoiceButtonDisabled = !onVoiceClick

  // TTS 재생 관련 상태
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const synthAbortRef = useRef<AbortController | null>(null)

  // TTS 합성 및 재생
  const handlePlayPause = useCallback(async () => {
    // 재생 중이면 일시정지
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    // 스크립트가 없으면 재생 불가
    if (!scriptText.trim()) {
      alert('스크립트를 입력해주세요.')
      return
    }

    // 보이스가 선택되지 않았으면 재생 불가
    if (!voiceTemplate) {
      alert('보이스를 먼저 선택해주세요.')
      return
    }

    // 이미 합성된 오디오가 있으면 재생
    if (audioUrlRef.current && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
      return
    }

    // 이전 합성 요청 취소
    synthAbortRef.current?.abort()
    synthAbortRef.current = null
    const controller = new AbortController()
    synthAbortRef.current = controller

    // TTS 합성 시작
    setIsSynthesizing(true)
    try {
      const accessToken = authStorage.getAccessToken()
      if (!accessToken) {
        alert('로그인이 필요합니다.')
        return
      }

      // TTS 합성 API 호출
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          voiceTemplate,
          mode: 'text',
          text: scriptText,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'TTS 합성 실패' }))
        throw new Error(errorData.error || 'TTS 합성 실패')
      }

      // 오디오 blob 받기
      const blob = await response.blob()
      if (controller.signal.aborted) return

      const url = URL.createObjectURL(blob)
      if (controller.signal.aborted) {
        URL.revokeObjectURL(url)
        return
      }

      // 기존 오디오 정리
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      // 새 오디오 생성 및 재생
      audioUrlRef.current = url
      const audio = new Audio(url)
      audioRef.current = audio

      // 재생 종료 시 상태 초기화
      audio.addEventListener('ended', () => {
        setIsPlaying(false)
      })

      audio.addEventListener('error', () => {
        setIsPlaying(false)
        alert('오디오 재생 중 오류가 발생했습니다.')
      })

      await audio.play()
      if (controller.signal.aborted) return
      setIsPlaying(true)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      console.error('TTS 합성/재생 오류:', error)
      alert(error instanceof Error ? error.message : 'TTS 합성 중 오류가 발생했습니다.')
    } finally {
      setIsSynthesizing(false)
    }
  }, [isPlaying, scriptText, voiceTemplate])

  // 컴포넌트 언마운트 시 정리
  const cleanup = useCallback(() => {
    synthAbortRef.current?.abort()
    synthAbortRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }, [])

  // 스크립트나 보이스가 변경되면 오디오 무효화
  const prevScriptTextRef = useRef(scriptText)
  const prevVoiceTemplateRef = useRef(voiceTemplate)
  useEffect(() => {
    if (prevScriptTextRef.current !== scriptText || prevVoiceTemplateRef.current !== voiceTemplate) {
      cleanup()
      setIsPlaying(false)
      prevScriptTextRef.current = scriptText
      prevVoiceTemplateRef.current = voiceTemplate
    }
  }, [scriptText, voiceTemplate, cleanup])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

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
      <div className="flex gap-6 flex-col sm:flex-row">
        {/* 좌측: 드래그 아이콘 */}
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

        {/* 우측: Scene N + 삭제, 대본, 보이스 버튼, 적용된 보이스 */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-brand-teal tracking-[-0.36px]"
              style={{
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)',
                fontFamily: '"Zeroes Two", sans-serif',
                fontWeight: 400,
              }}
            >
              Scene {sceneIndex}
            </p>
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onDelete}
                aria-label="장면 삭제"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="relative">
            <textarea
              value={scriptText}
              onChange={(e) => onScriptChange(e.target.value)}
              placeholder="대본을 입력하세요."
              disabled={isGenerating}
              rows={2}
              className="w-full p-3 pr-12 rounded-lg bg-white text-text-dark placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-teal focus:border-transparent resize-none disabled:opacity-60 shadow-(--shadow-card-default)"
              style={{
                fontSize: 'var(--font-size-14)',
                lineHeight: 'var(--line-height-14-140)',
              }}
            />
            {/* TTS 재생 버튼 - textarea 내부 오른쪽 중간 */}
            <button
              type="button"
              onClick={handlePlayPause}
              disabled={isGenerating || isSynthesizing || !scriptText.trim() || !voiceTemplate}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
              aria-label={isPlaying ? '일시정지' : '재생'}
            >
              {isSynthesizing ? (
                <Loader2 className="w-4 h-4 animate-spin text-text-tertiary" />
              ) : isPlaying ? (
                // 일시정지 상태: play.svg + 두 개의 세로 막대
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <Image 
                    src="/icons/play.svg" 
                    alt="일시정지" 
                    width={16} 
                    height={16}
                    className="w-4 h-4 opacity-0 absolute"
                  />
                  <div className="flex items-center justify-center gap-0.5">
                    <div className="w-1 h-3 bg-text-tertiary rounded-sm" />
                    <div className="w-1 h-3 bg-text-tertiary rounded-sm" />
                  </div>
                </div>
              ) : (
                // 재생 상태: play.svg
                <Image 
                  src="/icons/play.svg" 
                  alt="재생" 
                  width={16} 
                  height={16}
                  className="w-4 h-4"
                />
              )}
            </button>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-brand-teal text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>대본 생성 중...</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={isVoiceButtonDisabled ? undefined : onVoiceClick}
              disabled={isVoiceButtonDisabled}
              aria-disabled={isVoiceButtonDisabled ? 'true' : 'false'}
              className={`w-full sm:w-[120px] h-10 rounded-lg overflow-hidden bg-white border border-[#BBC9C9] transition-colors flex items-center justify-center gap-2 text-text-tertiary shrink-0 px-2 ${
                isVoiceButtonDisabled
                  ? 'opacity-50 cursor-not-allowed pointer-events-none'
                  : 'hover:bg-[#e4eeed]'
              }`}
              aria-label="보이스 선택"
            >
              <Image
                src="/e_voice.svg"
                alt="보이스"
                width={20}
                height={20}
                className="shrink-0"
              />
              <span
                className="font-bold whitespace-nowrap"
                style={{
                  fontSize: 'var(--font-size-14)',
                  lineHeight: 'var(--line-height-12-140)',
                }}
              >
                보이스
              </span>
            </button>

            <div
              className="flex items-center gap-1 rounded-3xl border-2 border-white bg-white/30 px-3 py-2 shadow-(--shadow-card-default) backdrop-blur-sm text-text-tertiary"
              style={{
                fontSize: 'var(--font-size-14)',
                lineHeight: 'var(--line-height-14-140)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              <span>적용된 보이스 | &nbsp;</span>
              {voiceLabel && (
                <span
                  style={{
                    fontSize: 'var(--font-size-16)',
                    lineHeight: 'var(--line-height-16-140)',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  {voiceLabel}
                </span>
              )}
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
