'use client'

import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { TimelineData } from '@/store/useVideoCreateStore'
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
  const [isStrokeColorOpen, setIsStrokeColorOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const currentFontIdOrFamily = useMemo(() => {
    const raw = (currentScene?.text?.font || SUBTITLE_DEFAULT_FONT_ID).trim()
    if (raw === 'Pretendard-Bold' || raw === 'Pretendard') return 'pretendard'
    if (isSubtitleFontId(raw)) return raw
    // 기존 데이터(시스템 폰트 문자열 등)는 Step3 자막 폰트 UI에선 기본 폰트로 정규화
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
      if (!timeline) {
        console.warn('[SubtitleSettings] updateScene: timeline이 null입니다.')
        return
      }
      const nextTimeline: TimelineData = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) => (idx === currentSceneIndex ? updater(scene) : scene)),
      }
      console.log('[SubtitleSettings] updateScene: timeline 업데이트:', {
        currentSceneIndex,
        oldText: timeline.scenes[currentSceneIndex]?.text,
        newText: nextTimeline.scenes[currentSceneIndex]?.text,
      })
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
          stroke: baseText.stroke ? { ...baseText.stroke } : scene.text.stroke,
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

  const fontSizeInputRef = useRef<HTMLInputElement | null>(null)

  const applyFontSizeInput = useCallback(
    (value?: string) => {
      const currentSize = currentScene?.text?.fontSize || 80
      const raw = value !== undefined ? value : fontSizeInputRef.current?.value ?? ''
      const trimmed = raw.trim()
      if (trimmed === '') {
        if (fontSizeInputRef.current) {
          fontSizeInputRef.current.value = String(currentSize)
        }
        return
      }
      const parsed = Number(trimmed)
      if (Number.isNaN(parsed)) {
        if (fontSizeInputRef.current) {
          fontSizeInputRef.current.value = String(currentSize)
        }
        return
      }
      const clamped = Math.min(200, Math.max(0, parsed))
      if (fontSizeInputRef.current) {
        fontSizeInputRef.current.value = String(clamped)
      }
      updateScene((scene) => ({
        ...scene,
        text: { ...scene.text, fontSize: clamped },
      }))
    },
    [currentScene?.text?.fontSize, updateScene],
  )

  if (!timeline || !currentScene) return null

  return (
    <div className="space-y-4" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
      {/* 기본 서식 섹션 */}
      <div>
        <h3 
          className="font-bold text-text-dark mb-3 tracking-[-0.4px]"
          style={{ 
            fontSize: 'var(--font-size-18)',
            lineHeight: '25.2px'
          }}
        >
          기본 서식
        </h3>

        <div className="space-y-6">
          {/* 컬러 섹션 */}
          <div className="relative">
            <label 
              className="font-medium text-text-dark mb-2 block"
              style={{ 
                fontSize: '12px',
                lineHeight: '16.8px'
              }}
            >
              컬러
            </label>
            <button
              type="button"
              onClick={() => setIsColorOpen((v) => !v)}
              className="w-full bg-white border border-[#d6d6d6] rounded-lg p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span
                  className="h-5 w-5 rounded border border-gray-200 shrink-0"
                  style={{
                    backgroundColor: currentScene.text?.color || '#000000',
                  }}
                />
                <span 
                  className="font-medium text-black"
                  style={{ 
                    fontSize: 'var(--font-size-14)',
                    lineHeight: '19.6px',
                    letterSpacing: '-0.28px'
                  }}
                >
                  {(currentScene.text?.color || '#000000').toUpperCase()}
                </span>
              </div>
            </button>
            <AnimatePresence>
              {isColorOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 z-50 min-w-[320px]"
                >
                  <SubtitleColorPalette
                    theme={theme}
                    value={currentScene.text?.color || '#000000'}
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 테두리 섹션 */}
          <div>
            <label 
              className="font-medium text-text-dark mb-2 block"
              style={{ 
                fontSize: '12px',
                lineHeight: '16.8px'
              }}
            >
              테두리
            </label>
            <div className="flex gap-3">
              {/* Stroke 색상 */}
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setIsStrokeColorOpen((v) => !v)}
                  className="w-full bg-white border border-[#d6d6d6] rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="h-5 w-5 rounded border border-gray-200 shrink-0"
                      style={{
                        backgroundColor: currentScene.text?.stroke?.color || '#000000',
                      }}
                    />
                    <span 
                      className="font-medium text-black"
                      style={{ 
                        fontSize: 'var(--font-size-14)',
                        lineHeight: '19.6px',
                        letterSpacing: '-0.28px'
                      }}
                    >
                      {(currentScene.text?.stroke?.color || '#000000').toUpperCase()}
                    </span>
                  </div>
                </button>
                <AnimatePresence>
                  {isStrokeColorOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 mt-2 z-50 min-w-[320px]"
                    >
                      <SubtitleColorPalette
                        theme={theme}
                        value={currentScene.text?.stroke?.color || '#000000'}
                        onChange={(next) => {
                          updateScene((scene) => ({
                            ...scene,
                            text: {
                              ...scene.text,
                              stroke: {
                                ...scene.text.stroke,
                                color: next,
                              },
                            },
                          }))
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stroke 두께 */}
              <div className="flex-1">
                <div className="bg-white border border-[#d6d6d6] rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={currentScene.text?.stroke?.width || 10}
                        min={0}
                        max={50}
                        onChange={(e) => {
                          const width = parseInt(e.target.value, 10)
                          if (!isNaN(width)) {
                            const clampedWidth = Math.min(50, Math.max(0, width))
                            updateScene((scene) => ({
                              ...scene,
                              text: {
                                ...scene.text,
                                stroke: {
                                  ...scene.text.stroke,
                                  width: clampedWidth,
                                },
                              },
                            }))
                          }
                        }}
                        onBlur={(e) => {
                          const width = parseInt(e.target.value, 10)
                          const clampedWidth = Math.min(50, Math.max(0, isNaN(width) ? 10 : width))
                          updateScene((scene) => ({
                            ...scene,
                            text: {
                              ...scene.text,
                              stroke: {
                                ...scene.text.stroke,
                                width: clampedWidth,
                              },
                            },
                          }))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const width = parseInt((e.target as HTMLInputElement).value, 10)
                            const clampedWidth = Math.min(50, Math.max(0, isNaN(width) ? 10 : width))
                            updateScene((scene) => ({
                              ...scene,
                              text: {
                                ...scene.text,
                                stroke: {
                                  ...scene.text.stroke,
                                  width: clampedWidth,
                                },
                              },
                            }))
                          }
                        }}
                        className="h-7 text-text-dark text-center border-0 bg-transparent outline-none focus:outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0 w-auto min-w-[3ch]"
                        style={{ 
                          fontSize: 'var(--font-size-16)',
                          lineHeight: '22.4px',
                          letterSpacing: '-0.32px'
                        }}
                      />
                      <span 
                        className="font-medium text-black"
                        style={{ 
                          fontSize: 'var(--font-size-16)',
                          lineHeight: '22.4px',
                          letterSpacing: '-0.32px'
                        }}
                      >
                        px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const currentWidth = currentScene.text?.stroke?.width || 10
                          const newWidth = Math.max(0, currentWidth - 1)
                          updateScene((scene) => ({
                            ...scene,
                            text: {
                              ...scene.text,
                              stroke: {
                                ...scene.text.stroke,
                                width: newWidth,
                              },
                            },
                          }))
                        }}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <span className="text-black font-medium" style={{ fontSize: '16px' }}>&lt;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentWidth = currentScene.text?.stroke?.width || 10
                          const newWidth = Math.min(50, currentWidth + 1)
                          updateScene((scene) => ({
                            ...scene,
                            text: {
                              ...scene.text,
                              stroke: {
                                ...scene.text.stroke,
                                width: newWidth,
                              },
                            },
                          }))
                        }}
                        className="w-6 h-6 flex items-center justify-center"
                      >
                        <span className="text-black font-medium" style={{ fontSize: '16px' }}>&gt;</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 타이포그래피 설정 섹션 */}
          <div>
            <label 
              className="font-medium text-text-dark mb-2 block"
              style={{ 
                fontSize: '12px',
                lineHeight: '16.8px'
              }}
            >
              타이포그래피 설정
            </label>
            <div className="flex items-center">
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
                  className="w-[81px] h-10 bg-white border border-[#d6d6d6] rounded-lg text-text-dark"
                  style={{
                    fontFamily: currentFontFamily,
                    fontWeight: normalizedFontWeight,
                  }}
                >
                  <SelectValue placeholder="700" />
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
                className={`h-10 w-10 rounded-lg border border-[#d6d6d6] bg-white flex items-center justify-center ${
                  normalizedFontWeight >= 600 ? 'bg-[#5e8790] text-white border-[#5e8790]' : 'text-[#454545]'
                }`}
                style={{
                  borderColor: normalizedFontWeight >= 600 ? '#5e8790' : '#d6d6d6',
                  color: normalizedFontWeight >= 600 ? '#ffffff' : '#454545',
                  backgroundColor: normalizedFontWeight >= 600 ? '#5e8790' : '#ffffff',
                  opacity: resolveSubtitleFontWeights(currentFontIdOrFamily).includes(700) ? 1 : 0.5,
                }}
                type="button"
              >
                <span 
                  className="font-bold"
                  style={{ 
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px'
                  }}
                >
                  B
                </span>
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
                className={`h-10 w-10 rounded-lg border border-[#d6d6d6] bg-white flex items-center justify-center ${
                  currentScene.text?.style?.italic ? 'bg-[#5e8790] text-white border-[#5e8790]' : 'text-[#454545]'
                }`}
                style={{
                  borderColor: currentScene.text?.style?.italic ? '#5e8790' : '#d6d6d6',
                  color: currentScene.text?.style?.italic ? '#ffffff' : '#454545',
                  backgroundColor: currentScene.text?.style?.italic ? '#5e8790' : '#ffffff',
                }}
                type="button"
              >
                <span 
                  className="font-medium"
                  style={{ 
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px'
                  }}
                >
                  /
                </span>
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
                className={`h-10 w-10 rounded-lg border border-[#d6d6d6] bg-white flex items-center justify-center ${
                  currentScene.text?.style?.underline ? 'bg-[#5e8790] text-white border-[#5e8790]' : 'text-[#454545]'
                }`}
                style={{
                  borderColor: currentScene.text?.style?.underline ? '#5e8790' : '#d6d6d6',
                  color: currentScene.text?.style?.underline ? '#ffffff' : '#454545',
                  backgroundColor: currentScene.text?.style?.underline ? '#5e8790' : '#ffffff',
                }}
                type="button"
              >
                <span 
                  className="font-medium relative"
                  style={{ 
                    fontSize: 'var(--font-size-18)',
                    lineHeight: '25.2px'
                  }}
                >
                  U
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                      backgroundColor: currentScene.text?.style?.underline ? '#ffffff' : '#454545',
                    }}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 폰트 및 자막 위치 섹션 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label 
            className="font-medium text-text-dark mb-2 block"
            style={{ 
              fontSize: '12px',
              lineHeight: '16.8px'
            }}
          >
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
              className="w-full h-10 bg-white border border-[#d6d6d6] rounded-lg text-text-dark"
              style={{
                fontFamily: currentFontFamily,
                fontWeight: normalizedFontWeight,
              }}
            >
              <SelectValue placeholder="나눔고딕" />
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

        <div className="flex-1">
          <label 
            className="font-medium text-text-dark mb-2 block"
            style={{ 
              fontSize: '12px',
              lineHeight: '16.8px'
            }}
          >
            자막 위치
          </label>
          <select
            value={currentScene.text?.position || 'bottom'}
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
            className="w-full h-10 px-3 rounded-lg border border-[#d6d6d6] bg-white text-text-dark"
            style={{ 
              fontSize: 'var(--font-size-14)',
              lineHeight: '19.6px',
              letterSpacing: '-0.28px'
            }}
          >
            <option value="top">상단</option>
            <option value="center">중앙</option>
            <option value="bottom">하단</option>
          </select>
        </div>
      </div>

      {/* 크기 조절 섹션 */}
      <div>
        <label 
          className="font-medium text-text-dark mb-4 block"
          style={{ 
            fontSize: '12px',
            lineHeight: '16.8px'
          }}
        >
          크기 조절
        </label>
        <div className="bg-white border border-[#d6d6d6] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <input
                type="number"
                key={currentSceneIndex}
                defaultValue={currentScene.text?.fontSize || 80}
                ref={fontSizeInputRef}
                min={0}
                max={200}
                onBlur={(e) => applyFontSizeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyFontSizeInput((e.target as HTMLInputElement).value)
                  }
                }}
                className="h-10 text-text-dark text-center border-0 bg-transparent outline-none focus:outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0 w-auto min-w-[3ch]"
                style={{ 
                  fontSize: 'var(--font-size-16)',
                  lineHeight: '22.4px',
                  letterSpacing: '-0.32px'
                }}
              />
              <span 
                className="font-medium text-black"
                style={{ 
                  fontSize: 'var(--font-size-16)',
                  lineHeight: '22.4px',
                  letterSpacing: '-0.32px'
                }}
              >
                px
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const currentSize = currentScene.text?.fontSize || 80
                  const newSize = Math.max(8, currentSize - 1)
                  updateScene((scene) => ({
                    ...scene,
                    text: { ...scene.text, fontSize: newSize },
                  }))
                  if (fontSizeInputRef.current) {
                    fontSizeInputRef.current.value = String(newSize)
                  }
                }}
                className="w-6 h-6 flex items-center justify-center"
              >
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>&lt;</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentSize = currentScene.text?.fontSize || 80
                  const newSize = Math.min(200, currentSize + 1)
                  updateScene((scene) => ({
                    ...scene,
                    text: { ...scene.text, fontSize: newSize },
                  }))
                  if (fontSizeInputRef.current) {
                    fontSizeInputRef.current.value = String(newSize)
                  }
                }}
                className="w-6 h-6 flex items-center justify-center"
              >
                <span className="text-black font-medium" style={{ fontSize: '16px' }}>&gt;</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 모든 Scene에 설정 적용하기 버튼 */}
      <div className="relative">
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
              <div className="px-4 py-3 rounded-lg shadow-lg relative bg-white border border-gray-200">
                {/* 말풍선 꼬리 (아래쪽을 가리킴) */}
                <div
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-r border-b border-gray-200"
                />
                <p className="text-sm font-medium whitespace-nowrap relative z-10 text-text-dark">
                  모든 씬에 적용되었어요!
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={applyAllScenes}
          className="w-full h-10 rounded-2xl bg-[#5e8790] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#5e8790]/90 transition-all"
          style={{ 
            fontSize: 'var(--font-size-14)',
            lineHeight: '19.6px',
            letterSpacing: '-0.28px'
          }}
        >
          <Image src="/fonteffect.svg" alt="font effect" width={16} height={16} />
          <span>모든 Scene에 설정 적용하기</span>
        </button>
      </div>
    </div>
  )
}

