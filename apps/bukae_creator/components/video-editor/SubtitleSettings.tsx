'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  SUBTITLE_DEFAULT_FONT_ID,
  SUBTITLE_FONT_OPTIONS,
  isSubtitleFontId,
  resolveSubtitleFontFamily,
  resolveSubtitleFontWeights,
} from '@/lib/subtitle-fonts'
import { SubtitleColorPalette } from '@/components/video-editor/SubtitleColorPalette'

interface SubtitleSettingsProps {
  timeline: TimelineData | null
  currentSceneIndex: number
  theme: string
  setTimeline: (timeline: TimelineData) => void
}

export function SubtitleSettings({ timeline, currentSceneIndex, theme, setTimeline }: SubtitleSettingsProps) {
  const currentScene = useMemo(() => timeline?.scenes[currentSceneIndex], [timeline, currentSceneIndex])
  const [isColorOpen, setIsColorOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const currentFontIdOrFamily = useMemo(() => {
    const raw = (currentScene?.text?.font || SUBTITLE_DEFAULT_FONT_ID).trim()
    if (raw === 'Pretendard-Bold' || raw === 'Pretendard') return 'pretendard'
    if (isSubtitleFontId(raw)) return raw
    // 기존 데이터(시스템 폰트 문자열 등)는 Step4 자막 폰트 UI에선 기본 폰트로 정규화
    return SUBTITLE_DEFAULT_FONT_ID
  }, [currentScene?.text?.font])
  const currentFontFamily = useMemo(
    () => resolveSubtitleFontFamily(currentFontIdOrFamily),
    [currentFontIdOrFamily],
  )
  const availableWeights = useMemo(
    () => resolveSubtitleFontWeights(currentFontIdOrFamily),
    [currentFontIdOrFamily],
  )
  const currentFontWeight = useMemo(() => {
    const fromTimeline = currentScene?.text?.fontWeight
    if (typeof fromTimeline === 'number') return fromTimeline
    return currentScene?.text?.style?.bold ? 700 : 400
  }, [currentScene?.text?.fontWeight, currentScene?.text?.style?.bold])
  const normalizedFontWeight = useMemo(() => {
    if (availableWeights.length === 0) return currentFontWeight
    if (availableWeights.includes(currentFontWeight)) return currentFontWeight
    if (availableWeights.includes(700)) return 700
    if (availableWeights.includes(400)) return 400
    return availableWeights[0]
  }, [availableWeights, currentFontWeight])

  const updateScene = useCallback(
    (updater: (scene: TimelineData['scenes'][number]) => TimelineData['scenes'][number]) => {
      if (!timeline) return
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) => (idx === currentSceneIndex ? updater(scene) : scene)),
      }
      setTimeline(nextTimeline)
    },
    [timeline, currentSceneIndex, setTimeline],
  )

  const applyAllScenes = () => {
    if (!timeline) return
    const baseText = timeline.scenes[currentSceneIndex]?.text
    if (!baseText) return
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene) => ({
        ...scene,
        text: {
          ...scene.text,
          font: baseText.font,
          fontWeight: baseText.fontWeight,
          fontSize: baseText.fontSize,
          color: baseText.color,
          position: baseText.position,
          style: { ...baseText.style },
          transform: baseText.transform ? { ...baseText.transform } : scene.text.transform,
        },
      })),
    }
    setTimeline(nextTimeline)
    
    // 말풍선 UI 표시
    setShowToast(true)
  }

  // 말풍선이 표시될 때 자동으로 사라지게 하는 효과
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showToast])

  if (!timeline || !currentScene) return null

  return (
    <div className="space-y-4" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div
        className="p-3 rounded-lg border w-full"
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3
            className="text-sm font-semibold break-words min-w-0"
            style={{
              color: theme === 'dark' ? '#ffffff' : '#111827',
            }}
          >
            씬 {currentSceneIndex + 1} 자막 설정
          </h3>
        </div>

        <p
          className="text-sm mb-2 p-2 rounded break-words"
          style={{
            fontFamily: currentFontFamily,
            fontSize: Math.min(currentScene.text?.fontSize || 80, 20),
            color: currentScene.text?.color || '#ffffff',
            fontWeight: normalizedFontWeight,
            fontStyle: currentScene.text?.style?.italic ? 'italic' : 'normal',
            textDecoration: currentScene.text?.style?.underline ? 'underline' : 'none',
            backgroundColor: theme === 'dark' ? '#111827' : '#374151',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {currentScene.text?.content || '(자막 없음)'}
        </p>
      </div>

      <div
        className="p-3 rounded-lg border w-full"
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold" style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}>
            기본 서식
          </div>
        </div>

        <div className="space-y-3">
          {/* Row 1: weight (left) + style buttons (right) */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <Select
                value={String(normalizedFontWeight)}
                onValueChange={(value) => {
                  const nextWeight = parseInt(value, 10)
                  if (Number.isNaN(nextWeight)) return
                  updateScene((scene) => ({
                    ...scene,
                    text: {
                      ...scene.text,
                      fontWeight: nextWeight,
                      style: { ...scene.text.style, bold: nextWeight >= 600 },
                    },
                  }))
                }}
              >
                <SelectTrigger
                  className="w-full h-10 text-sm"
                  style={{
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
                    color: theme === 'dark' ? '#ffffff' : '#111827',
                    fontFamily: currentFontFamily,
                    fontWeight: normalizedFontWeight,
                  }}
                >
                  <SelectValue placeholder="굵기 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableWeights.map((w) => (
                    <SelectItem
                      key={w}
                      value={String(w)}
                      style={{
                        fontFamily: currentFontFamily,
                        fontWeight: w,
                      }}
                    >
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  updateScene((scene) => {
                    const weights = resolveSubtitleFontWeights(scene.text.font)
                    const canBold = weights.includes(700)
                    const normalCandidate =
                      weights.includes(400) ? 400 : weights.includes(500) ? 500 : weights.includes(300) ? 300 : weights[0] ?? 400
                    const nextWeight = canBold ? (normalizedFontWeight >= 600 ? normalCandidate : 700) : normalCandidate
                    return {
                      ...scene,
                      text: {
                        ...scene.text,
                        fontWeight: nextWeight,
                        style: { ...scene.text.style, bold: nextWeight >= 600 },
                      },
                    }
                  })
                }
                className={`h-10 w-10 rounded border text-sm font-bold ${
                  normalizedFontWeight >= 600 ? 'bg-purple-500 text-white border-purple-500' : ''
                }`}
                style={{
                  borderColor: normalizedFontWeight >= 600 ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: normalizedFontWeight >= 600 ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#374151',
                  backgroundColor: normalizedFontWeight >= 600 ? '#8b5cf6' : 'transparent',
                  opacity: resolveSubtitleFontWeights(currentFontIdOrFamily).includes(700) ? 1 : 0.5,
                }}
                type="button"
              >
                B
              </button>

              <button
                onClick={() =>
                  updateScene((scene) => ({
                    ...scene,
                    text: {
                      ...scene.text,
                      style: { ...scene.text.style, italic: !(scene.text.style?.italic ?? false) },
                    },
                  }))
                }
                className={`h-10 w-10 rounded border text-sm italic ${
                  currentScene.text?.style?.italic ? 'bg-purple-500 text-white border-purple-500' : ''
                }`}
                style={{
                  borderColor: currentScene.text?.style?.italic ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: currentScene.text?.style?.italic ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#374151',
                  backgroundColor: currentScene.text?.style?.italic ? '#8b5cf6' : 'transparent',
                }}
                type="button"
              >
                I
              </button>

              <button
                onClick={() =>
                  updateScene((scene) => ({
                    ...scene,
                    text: {
                      ...scene.text,
                      style: { ...scene.text.style, underline: !(scene.text.style?.underline ?? false) },
                    },
                  }))
                }
                className={`h-10 w-10 rounded border text-sm underline ${
                  currentScene.text?.style?.underline ? 'bg-purple-500 text-white border-purple-500' : ''
                }`}
                style={{
                  borderColor: currentScene.text?.style?.underline ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
                  color: currentScene.text?.style?.underline ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#374151',
                  backgroundColor: currentScene.text?.style?.underline ? '#8b5cf6' : 'transparent',
                }}
                type="button"
              >
                U
              </button>
            </div>
          </div>

          {/* Row 2: color + toggle palette */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
                색
              </label>
              <button
                type="button"
                onClick={() => setIsColorOpen((v) => !v)}
                className="text-xs underline shrink-0"
                style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
              >
                {isColorOpen ? '닫기' : '팔레트'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsColorOpen(true)}
              className="mt-2 flex items-center gap-2 w-full rounded border px-3 py-2"
              style={{
                backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              }}
              aria-label="색상 선택"
            >
              <span
                className="h-5 w-5 rounded border shrink-0"
                style={{
                  backgroundColor: currentScene.text?.color || '#ffffff',
                  borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                }}
              />
              <span className="text-sm truncate min-w-0 flex-1" style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}>
                {(currentScene.text?.color || '#ffffff').toUpperCase()}
              </span>
            </button>

            {isColorOpen && (
              <div className="mt-2">
                <SubtitleColorPalette
                  theme={theme}
                  value={currentScene.text?.color || '#ffffff'}
                  onChange={(next) => {
                    updateScene((scene) => ({
                      ...scene,
                      text: {
                        ...scene.text,
                        color: next,
                      },
                    }))
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          폰트
        </label>
        <Select
          value={currentFontIdOrFamily}
          onValueChange={(nextFont) => {
            const nextWeights = resolveSubtitleFontWeights(nextFont)
            const nextWeight = nextWeights.includes(normalizedFontWeight)
              ? normalizedFontWeight
              : nextWeights.includes(700)
                ? 700
                : nextWeights[0] ?? 400

            updateScene((scene) => ({
              ...scene,
              text: {
                ...scene.text,
                font: nextFont,
                fontWeight: nextWeight,
                style: { ...scene.text.style, bold: nextWeight >= 600 },
              },
            }))
          }}
        >
          <SelectTrigger
            className="w-full h-10 text-sm"
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              color: theme === 'dark' ? '#ffffff' : '#111827',
              fontFamily: currentFontFamily,
              fontWeight: normalizedFontWeight,
            }}
          >
            <SelectValue placeholder="폰트를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {SUBTITLE_FONT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.id}
                value={opt.id}
                style={{
                  fontFamily: opt.fontFamily,
                  fontWeight: 400,
                }}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          크기
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={8}
            max={200}
            value={currentScene.text?.fontSize || 80}
            onChange={(e) => {
              const val = parseInt(e.target.value || '0', 10)
              if (Number.isNaN(val)) return
              const fontSize = Math.max(8, Math.min(200, val))
              updateScene((scene) => ({
                ...scene,
                text: { ...scene.text, fontSize },
              }))
            }}
            className="w-20 px-2 py-1 rounded border text-sm text-center"
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              color: theme === 'dark' ? '#ffffff' : '#111827',
            }}
          />
          <input
            type="range"
            min={8}
            max={200}
            value={currentScene.text?.fontSize || 80}
            onChange={(e) => {
              const fontSize = parseInt(e.target.value, 10)
              updateScene((scene) => ({
                ...scene,
                text: { ...scene.text, fontSize },
              }))
            }}
            className="flex-1 min-w-0"
            style={{ accentColor: '#8b5cf6' }}
          />
          <span className="text-xs shrink-0" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
            px
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          위치
        </label>
        <select
          value={currentScene.text?.position || 'center'}
          onChange={(e) => {
            const newPosition = e.target.value
            updateScene((scene) => {
              // 위치에 따른 Y 좌표 계산 (1080x1920 기준)
              const height = 1920
              let textY = height / 2 // center
              if (newPosition === 'top') {
                textY = 200
              } else if (newPosition === 'bottom') {
                textY = height - 200
              }

              // transform이 있으면 transform.y도 업데이트
              const updatedText = {
                ...scene.text,
                position: newPosition,
              }

              if (scene.text.transform) {
                updatedText.transform = {
                  ...scene.text.transform,
                  y: textY,
                  // x는 중앙 유지
                  x: scene.text.transform.x || 1080 / 2,
                }
              }

              return {
                ...scene,
                text: updatedText,
              }
            })
          }}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
            color: theme === 'dark' ? '#ffffff' : '#111827',
          }}
        >
          <option value="top">상단</option>
          <option value="center">중앙</option>
          <option value="bottom">하단</option>
        </select>
      </div>

      <div className="pt-2 border-t relative" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
        {/* 말풍선 UI */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 z-50 mb-2"
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="px-4 py-3 rounded-lg shadow-lg relative"
                style={{
                  backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                  border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                  boxShadow: theme === 'dark' 
                    ? '0 10px 25px rgba(0, 0, 0, 0.5)' 
                    : '0 10px 25px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* 말풍선 꼬리 (아래쪽을 가리킴) */}
                <div
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45"
                  style={{
                    backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
                    borderRight: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                    borderBottom: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
                  }}
                />
                <p
                  className="text-sm font-medium whitespace-nowrap relative z-10"
                  style={{
                    color: theme === 'dark' ? '#ffffff' : '#111827',
                  }}
                >
                  모든 씬에 적용되었어요!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <Button onClick={applyAllScenes} className="w-full h-10 text-sm" variant="outline">
          ✨ 모든 씬에 적용하기
        </Button>
      </div>
    </div>
  )
}

