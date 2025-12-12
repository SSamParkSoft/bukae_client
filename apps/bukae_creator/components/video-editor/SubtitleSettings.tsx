'use client'

import { useMemo, useCallback } from 'react'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { Button } from '@/components/ui/button'

interface SubtitleSettingsProps {
  timeline: TimelineData | null
  currentSceneIndex: number
  theme: string
  setTimeline: (timeline: TimelineData) => void
}

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Georgia',
  'Palatino',
  'Garamond',
  'Impact',
  'Comic Sans MS',
  'Trebuchet MS',
  'Lucida Console',
]

export function SubtitleSettings({ timeline, currentSceneIndex, theme, setTimeline }: SubtitleSettingsProps) {
  const currentScene = useMemo(() => timeline?.scenes[currentSceneIndex], [timeline, currentSceneIndex])

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
          fontSize: baseText.fontSize,
          color: baseText.color,
          position: baseText.position,
          style: { ...baseText.style },
          transform: baseText.transform ? { ...baseText.transform } : scene.text.transform,
        },
      })),
    }
    setTimeline(nextTimeline)
  }

  if (!timeline || !currentScene) return null

  return (
    <div className="space-y-4">
      <div
        className="p-3 rounded-lg border"
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3
            className="text-sm font-semibold"
            style={{
              color: theme === 'dark' ? '#ffffff' : '#111827',
            }}
          >
            씬 {currentSceneIndex + 1} 자막 설정
          </h3>
        </div>

        <p
          className="text-sm mb-2 p-2 rounded truncate"
          style={{
            fontFamily: currentScene.text?.font || 'Arial',
            fontSize: Math.min(currentScene.text?.fontSize || 32, 20),
            color: currentScene.text?.color || '#ffffff',
            fontWeight: currentScene.text?.style?.bold ? 'bold' : 'normal',
            fontStyle: currentScene.text?.style?.italic ? 'italic' : 'normal',
            textDecoration: currentScene.text?.style?.underline ? 'underline' : 'none',
            backgroundColor: theme === 'dark' ? '#111827' : '#374151',
          }}
        >
          {currentScene.text?.content || '(자막 없음)'}
        </p>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          폰트
        </label>
        <select
          value={currentScene.text?.font || 'Arial'}
          onChange={(e) =>
            updateScene((scene) => ({
              ...scene,
              text: {
                ...scene.text,
                font: e.target.value,
              },
            }))
          }
          className="w-full px-3 py-2 rounded border text-sm"
          style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
            color: theme === 'dark' ? '#ffffff' : '#111827',
            fontFamily: currentScene.text?.font || 'Arial',
          }}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
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
            value={currentScene.text?.fontSize || 32}
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
            value={currentScene.text?.fontSize || 32}
            onChange={(e) => {
              const fontSize = parseInt(e.target.value, 10)
              updateScene((scene) => ({
                ...scene,
                text: { ...scene.text, fontSize },
              }))
            }}
            className="flex-1"
            style={{ accentColor: '#8b5cf6' }}
          />
          <span className="text-xs" style={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
            px
          </span>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          색상
        </label>
        <input
          type="color"
          value={currentScene.text?.color || '#ffffff'}
          onChange={(e) =>
            updateScene((scene) => ({
              ...scene,
              text: {
                ...scene.text,
                color: e.target.value,
              },
            }))
          }
          className="w-full h-10 rounded border"
          style={{
            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
            borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
          }}
        />
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          위치
        </label>
        <select
          value={currentScene.text?.position || 'center'}
          onChange={(e) =>
            updateScene((scene) => ({
              ...scene,
              text: { ...scene.text, position: e.target.value },
            }))
          }
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

      <div>
        <label className="text-xs mb-1 block" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
          스타일
        </label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() =>
              updateScene((scene) => ({
                ...scene,
                text: {
                  ...scene.text,
                  style: { ...scene.text.style, bold: !(scene.text.style?.bold ?? false) },
                },
              }))
            }
            className={`px-3 py-1.5 rounded border text-sm font-bold ${
              currentScene.text?.style?.bold ? 'bg-purple-500 text-white border-purple-500' : ''
            }`}
            style={{
              borderColor: currentScene.text?.style?.bold ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
              color: currentScene.text?.style?.bold ? '#ffffff' : theme === 'dark' ? '#d1d5db' : '#374151',
              backgroundColor: currentScene.text?.style?.bold ? '#8b5cf6' : 'transparent',
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
            className={`px-3 py-1.5 rounded border text-sm italic ${
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
            className={`px-3 py-1.5 rounded border text-sm underline ${
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
          <select
            value={currentScene.text?.style?.align || 'left'}
            onChange={(e) =>
              updateScene((scene) => ({
                ...scene,
                text: {
                  ...scene.text,
                  style: { ...scene.text.style, align: e.target.value as 'left' | 'center' | 'right' | 'justify' },
                },
              }))
            }
            className="px-3 py-2 rounded border text-sm"
            style={{
              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
              borderColor: theme === 'dark' ? '#374151' : '#d1d5db',
              color: theme === 'dark' ? '#ffffff' : '#111827',
            }}
          >
            <option value="left">왼쪽 정렬</option>
            <option value="center">가운데 정렬</option>
            <option value="right">오른쪽 정렬</option>
            <option value="justify">양쪽 정렬</option>
          </select>
        </div>
      </div>

      <div className="pt-2 border-t" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
        <Button onClick={applyAllScenes} className="w-full" variant="outline">
          ✨ 모든 씬에 적용하기
        </Button>
      </div>
    </div>
  )
}

