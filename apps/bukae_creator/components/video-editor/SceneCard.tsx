'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, Loader2, X } from 'lucide-react'
import { transitionLabels } from '@/lib/data/transitions'
import { findSoundEffectMetadataByPath } from '@/lib/data/sound-effects'
import { voiceTemplateHelpers } from '@/store/useVideoCreateStore'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { getScenePlaceholder } from '@/lib/utils/placeholder-image'
import { formatTime } from '@/utils/timeline'
import type { TimelineScene } from '@/lib/types/domain/timeline'
import type { SceneScript } from '@/lib/types/domain/script'

const ICONS = {
  play: '/icons/play.svg',
  duplication: '/icons/duplication.svg',
  splitup: '/icons/splitup.svg',
  transition: '/icons/transition.svg',
  subtitle: '/icons/subtitle.svg',
  voice: '/icons/voice.svg',
  sound: '/icons/sound.svg',
} as const

export interface SceneCardProps {
  sceneIndex: number
  scene: SceneScript
  timelineScene: TimelineScene | undefined
  thumbnailUrl: string | null
  sceneOrderNumber: number
  isPlaying: boolean
  isSelected: boolean
  isGrouped: boolean
  voiceTemplate: string | null
  onSelect: () => void
  onScriptChange: (value: string) => void
  onPlayScene: () => void
  onDuplicateScene: () => void
  onSplitScene: () => void
  onDeleteScene?: () => void
  isPreparing?: boolean
  isTtsBootstrapping?: boolean
  onOpenEffectPanel?: (tab: 'animation' | 'subtitle' | 'voice' | 'sound') => void
  /** 드래그 핸들 (SceneList에서 드래그 시 사용) */
  dragHandle?: React.ReactNode
  /** 씬 시작 시간(초) - 00:00 - 00:00 형식 표시용 */
  sceneStartTime?: number
  /** 씬 끝 시간(초) - 00:00 - 00:00 형식 표시용 */
  sceneEndTime?: number
}

export function SceneCard({
  sceneIndex,
  scene,
  timelineScene,
  thumbnailUrl,
  sceneOrderNumber,
  isPlaying,
  isSelected,
  isGrouped: _isGrouped,
  voiceTemplate,
  onSelect,
  onScriptChange,
  onPlayScene,
  onDuplicateScene,
  onSplitScene,
  onDeleteScene,
  isPreparing = false,
  isTtsBootstrapping = false,
  onOpenEffectPanel: _onOpenEffectPanel,
  dragHandle,
  sceneStartTime,
  sceneEndTime,
}: SceneCardProps) {
  const [openEffectId, setOpenEffectId] = useState<'animation' | 'subtitle' | 'voice' | 'sound' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 효과 적용 여부: 전환은 둘 다 없음일 때만 아이콘 숨김
  const hasTransition = Boolean(
    (timelineScene?.transition && timelineScene.transition !== 'none') ||
    (timelineScene?.motion != null)
  )
  const hasSubtitle = Boolean(
    timelineScene?.text?.content?.trim() ||
    (scene.script && scene.script.replace(/\s*\|\|\|\s*/g, ' ').trim().length > 0)
  )
  const hasVoice = Boolean(timelineScene?.voiceTemplate ?? voiceTemplate)
  const hasSound = Boolean(timelineScene?.soundEffect != null && timelineScene.soundEffect !== '')

  // 표시용: ||| 만 공백으로 치환 (띄어쓰기 유지를 위해 trim 하지 않음)
  const displayScript = scene.script.replace(/\s*\|\|\|\s*/g, ' ')

  const validThumbnailUrl =
    thumbnailUrl == null || thumbnailUrl === ''
      ? getScenePlaceholder(sceneIndex)
      : thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')
        ? thumbnailUrl
        : thumbnailUrl.startsWith('//')
          ? `https:${thumbnailUrl}`
          : thumbnailUrl.startsWith('/')
            ? thumbnailUrl
            : getScenePlaceholder(sceneIndex)

  const hasStartEnd =
    sceneStartTime != null &&
    sceneEndTime != null &&
    !Number.isNaN(sceneStartTime) &&
    !Number.isNaN(sceneEndTime)
  const durationLabel = hasStartEnd
    ? `${formatTime(sceneStartTime, false)} ~ ${formatTime(sceneEndTime, false)}`
    : '--:-- ~ --:--'

  const handleEffectMouseEnter = (id: 'animation' | 'subtitle' | 'voice' | 'sound') => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current)
      leaveTimeoutRef.current = null
    }
    setOpenEffectId(id)
  }

  const handleEffectMouseLeave = () => {
    leaveTimeoutRef.current = setTimeout(() => {
      setOpenEffectId(null)
      leaveTimeoutRef.current = null
    }, 100)
  }

  const effectItems: Array<{ id: 'animation' | 'subtitle' | 'voice' | 'sound'; label: string; show: boolean; icon: string }> = [
    { id: 'animation', label: '전환', show: hasTransition, icon: ICONS.transition },
    { id: 'subtitle', label: '자막', show: hasSubtitle, icon: ICONS.subtitle },
    { id: 'voice', label: '보이스', show: hasVoice, icon: ICONS.voice },
    { id: 'sound', label: '사운드', show: hasSound, icon: ICONS.sound },
  ]

  // 선택된 효과에 해당하는 설정 정보만 가져오기
  const getEffectContent = () => {
    if (!timelineScene || !openEffectId) return null

    const sceneVoiceTemplate = timelineScene.voiceTemplate || voiceTemplate
    const voiceName = sceneVoiceTemplate
      ? (() => {
          const voiceInfo = voiceTemplateHelpers.getVoiceInfo(sceneVoiceTemplate)
          return voiceInfo?.displayName || sceneVoiceTemplate
        })()
      : '선택 안 됨'
    const transitionName = transitionLabels[timelineScene.transition] || timelineScene.transition || '없음'
    const soundEffectName = timelineScene.soundEffect
      ? (() => {
          const metadata = findSoundEffectMetadataByPath(timelineScene.soundEffect)
          return metadata?.label || timelineScene.soundEffect
        })()
      : '없음'
    const textSettings = timelineScene.text
    const fontFamily = textSettings?.font ? resolveSubtitleFontFamily(textSettings.font) : '기본'
    const fontSize = textSettings?.fontSize || 80
    const color = textSettings?.color || '#ffffff'
    const fontWeight = textSettings?.fontWeight || (textSettings?.style?.bold ? 700 : 400)

    const motionLabels: Record<string, string> = {
      'slide-left': '왼쪽으로',
      'slide-right': '오른쪽으로',
      'slide-up': '위로',
      'slide-down': '아래로',
      'zoom-in': '확대',
      'zoom-out': '축소',
      rotate: '회전',
      fade: '페이드',
    }
    const motionName = timelineScene.motion
      ? (motionLabels[timelineScene.motion.type] ?? timelineScene.motion.type)
      : '없음'

    const labelClass = 'text-[14px] font-semibold text-[#5E8790] mb-1'
    const contentClass = 'text-[12px] text-gray-900'

    switch (openEffectId) {
      case 'animation':
        return (
          <div className="space-y-3">
            <div>
              <div className={labelClass}>전환효과</div>
              <div className={contentClass}>{transitionName}</div>
            </div>
            <div>
              <div className={labelClass}>움직임</div>
              <div className={contentClass}>{motionName}</div>
            </div>
          </div>
        )
      case 'subtitle':
        return (
          <div>
            <div className={labelClass}>자막</div>
            <div className={`space-y-1 ${contentClass}`}>
              <div>폰트: {fontFamily}</div>
              <div>크기: {fontSize}px</div>
              <div>색상: <span className="inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: color }} /> {color}</div>
              <div>굵기: {fontWeight}</div>
            </div>
          </div>
        )
      case 'voice':
        return (
          <div>
            <div className={labelClass}>보이스</div>
            <div className={contentClass}>{voiceName}</div>
          </div>
        )
      case 'sound':
        return (
          <div>
            <div className={labelClass}>사운드</div>
            <div className={contentClass}>{soundEffectName}</div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      className={`relative rounded-2xl p-4 transition-all cursor-pointer shadow-(--shadow-card-default) box-border ${
        isPlaying
          ? 'bg-[#D2DEDD]/60 border-4 border-[#ffffff]/20 shadow-lg bg-blur'
          : isSelected
            ? 'bg-[#D2DEDD]/60 border-4 border-[#ffffff]/20 shadow-lg bg-blur'
            : 'bg-white/80'
      }`}
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (
          target.tagName !== 'BUTTON' &&
          target.tagName !== 'TEXTAREA' &&
          !target.closest('button') &&
          !target.closest('textarea') &&
          !target.closest('[role="button"]') &&
          !target.closest('[data-effect-dropdown]')
        ) {
          e.preventDefault()
          e.stopPropagation()
          onSelect()
        }
      }}
    >
      {/* 상단: [드래그핸들] (이미지 + 재생·씬복사·씬분할) | 씬번호 + 자막 */}
      <div className="flex gap-3">
        {dragHandle != null && (
          <div className="shrink-0 flex items-center pt-1">{dragHandle}</div>
        )}
        <div className="flex flex-col items-center gap-2 shrink-0 w-fit">
          <div className="w-[120px] h-[120px] rounded-lg overflow-hidden bg-bg-gray-placeholder shrink-0">
            {validThumbnailUrl && (
              <Image
                src={validThumbnailUrl}
                alt={`Scene ${sceneOrderNumber}`}
                width={120}
                height={120}
                className="w-full h-full object-cover"
                unoptimized
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = getScenePlaceholder(sceneIndex)
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPlayScene()
              }}
              disabled={isPreparing || isTtsBootstrapping}
              className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-(--shadow-card-default)"
              title={isPreparing || isTtsBootstrapping ? '준비 중...' : isPlaying ? '씬 정지' : '씬 재생'}
              aria-label={isPreparing || isTtsBootstrapping ? '준비 중' : isPlaying ? '씬 정지' : '씬 재생'}
            >
              {isPreparing || isTtsBootstrapping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Image src={ICONS.play} alt="" width={16} height={16} className="w-4 h-4" aria-hidden unoptimized />
              )}
            </button>
            <div className="flex rounded-lg gap-2 bg-white overflow-hidden shadow-(--shadow-card-default)">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDuplicateScene()
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-all"
                title="씬 복사"
                aria-label="씬 복사"
              >
                <Image src={ICONS.duplication} alt="" width={16} height={16} className="w-4.5 h-4.5" aria-hidden unoptimized />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSplitScene()
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-all"
                title="장면 분할"
                aria-label="자막 장면 분할"
              >
                <Image src={ICONS.splitup} alt="" width={16} height={16} className="w-5 h-5" aria-hidden unoptimized />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span
              className="text-brand-teal tracking-[-0.36px] text-left"
              style={{
                fontSize: 'var(--font-size-18)',
                lineHeight: 'var(--line-height-18-140)',
                fontFamily: '"Zeroes Two", sans-serif',
                fontWeight: 400,
              }}
            >
              SCENE {sceneOrderNumber}
            </span>
            {onDeleteScene && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('이 씬을 삭제하시겠습니까?')) {
                    onDeleteScene()
                  }
                }}
                className="w-6 h-6 flex items-center justify-center shrink-0 hover:opacity-70 transition-opacity"
                title="씬 삭제"
                aria-label="씬 삭제"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            )}
          </div>
          <textarea
            value={displayScript}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\s*\|\|\|\s*/g, ' ')
              onScriptChange(cleaned)
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-full min-h-[72px] p-2 rounded-lg border resize-none bg-white border-gray-300 text-text-dark focus:outline-none focus:ring-2 focus:ring-brand-teal tracking-[-0.28px] text-left"
            style={{ fontSize: 'var(--font-size-14)', lineHeight: 'var(--line-height-14-140)' }}
            placeholder="자막 입력..."
          />
          {/* 재생시간과 효과 아이콘을 한 줄에 배치 */}
          <div className="flex items-center justify-between gap-2 pt-6" data-effect-dropdown>
            <span
              className="text-[#5D5D5D] font-medium tabular-nums shrink-0"
              style={{ fontSize: 'var(--font-size-14)', lineHeight: 'var(--line-height-12-140)' }}
            >
              {durationLabel}
            </span>
            <div
              className="relative shrink-0"
              ref={dropdownRef}
              onMouseEnter={() => {
                if (leaveTimeoutRef.current) {
                  clearTimeout(leaveTimeoutRef.current)
                  leaveTimeoutRef.current = null
                }
              }}
              onMouseLeave={handleEffectMouseLeave}
            >
              <div className="flex items-center justify-center gap-0 rounded-xl bg-[#ffffff]/10 backdrop-blur-sm border border-[#ffffff]/30 shadow-lg overflow-hidden">
                {effectItems.filter((item) => item.show).map((item) => (
                  <div key={item.id} className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => handleEffectMouseEnter(item.id)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/60 transition-all text-[#2c2c2c]"
                      title={item.label}
                    >
                      <Image src={item.icon} alt="" width={16} height={16} className="w-5 h-5" aria-hidden unoptimized />
                    </button>
                  </div>
                ))}
              </div>
              <AnimatePresence>
                {openEffectId && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute right-0 bottom-full py-4 px-4 rounded-lg bg-white border border-[#88a9ac]/30 shadow-lg z-20 w-80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getEffectContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
