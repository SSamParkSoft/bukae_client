'use client'

import { useMemo } from 'react'

type SubtitleColorPaletteProps = {
  value: string
  onChange: (color: string) => void
  theme: string
}

const PRESET_COLORS = [
  '#0f172a', '#111827', '#1f2937', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#ffffff',
  '#000000', '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fecaca',
  '#78350f', '#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fde68a',
  '#365314', '#3f6212', '#4d7c0f', '#65a30d', '#84cc16', '#a3e635', '#d9f99d',
  '#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#a7f3d0',
  '#0c4a6e', '#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd',
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#bfdbfe',
  '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#ddd6fe',
  '#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#fbcfe8',
]

function normalizeHex(value: string): string {
  const v = (value || '').trim()
  if (!v) return '#ffffff'
  if (v.startsWith('#')) return v
  return `#${v}`
}

export function SubtitleColorPalette({ value, onChange, theme }: SubtitleColorPaletteProps) {
  const current = useMemo(() => normalizeHex(value), [value])

  return (
    <div
      className="mt-2 rounded-lg border p-3 w-full"
      style={{
        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
      }}
    >
      <div className="grid grid-cols-10 gap-1.5">
        {PRESET_COLORS.map((c) => {
          const isActive = current.toLowerCase() === c.toLowerCase()
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="h-6 w-6 rounded border"
              style={{
                backgroundColor: c,
                borderColor: isActive ? '#8b5cf6' : theme === 'dark' ? '#374151' : '#e5e7eb',
                boxShadow: isActive ? '0 0 0 2px rgba(139, 92, 246, 0.35)' : undefined,
              }}
              aria-label={`색상 ${c}`}
            />
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-8 w-8 rounded border shrink-0"
            style={{
              backgroundColor: current,
              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
            }}
            aria-label="현재 색상"
          />
          <div className="text-xs truncate" style={{ color: theme === 'dark' ? '#d1d5db' : '#374151' }}>
            {current.toUpperCase()}
          </div>
        </div>

        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border shrink-0"
          style={{
            backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
            borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          }}
          aria-label="커스텀 색상 선택"
        />
      </div>
    </div>
  )
}


