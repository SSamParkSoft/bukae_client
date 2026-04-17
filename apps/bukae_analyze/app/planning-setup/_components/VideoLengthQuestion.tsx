'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, ChevronDown, Check } from 'lucide-react'
import type { VideoLength } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader, CustomTextInput } from './shared'

const OPTIONS: { value: VideoLength; label: string }[] = [
  { value: 'under-15s', label: '15초 이내 (릴스 최적)' },
  { value: '15-30s', label: '15~30초' },
  { value: '30-45s', label: '30~45초' },
  { value: '45-60s', label: '45~60초' },
]

function triggerLabel(data: QuestionSectionViewModel<VideoLength>): string {
  if (data.selected === null) return '선택하세요'
  if (data.selected === 'custom') {
    const t = data.customValue.trim()
    return t.length > 0 ? t : '직접 입력'
  }
  return OPTIONS.find(o => o.value === data.selected)?.label ?? '선택하세요'
}

interface Props {
  data: QuestionSectionViewModel<VideoLength>
}

export function VideoLengthQuestion({ data }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current
      if (el && !el.contains(e.target as Node)) close()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  const pick = (value: VideoLength | 'custom') => {
    data.onSelect(value)
    setOpen(false)
  }

  const label = triggerLabel(data)
  const isPlaceholder = data.selected === null

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Clock}
        title="목표 영상 길이"
        subtitle="최종 영상의 길이를 선택하세요."
      />
      <div ref={rootRef} className="relative flex flex-col gap-4">
        <button
          type="button"
          id="video-length-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls="video-length-listbox"
          onClick={() => setOpen(v => !v)}
          className={`flex h-[60px] w-full items-center justify-between gap-3 rounded-lg border px-6 backdrop-blur-[2px] transition-colors focus:outline-none focus-visible:border-highlight/60 focus-visible:ring-2 focus-visible:ring-highlight/25 ${
            open
              ? 'border-white/60 bg-white/15 text-white'
              : 'border-white/40 bg-white/5 text-white hover:border-white/50 hover:bg-white/10'
          }`}
        >
          <span
            className={`min-w-0 truncate text-left font-20-md ${isPlaceholder ? 'text-white/50' : 'text-white/90'}`}
          >
            {label}
          </span>
          <ChevronDown
            className={`size-5 shrink-0 text-white/60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            strokeWidth={1.5}
            aria-hidden
          />
        </button>

        {open && (
          <ul
            id="video-length-listbox"
            role="listbox"
            aria-labelledby="video-length-trigger"
            className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-lg border border-white/20 bg-brand/95 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-glass-soft"
          >
            {OPTIONS.map(option => {
              const selected = data.selected === option.value
              return (
                <li key={option.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => pick(option.value)}
                    className={`flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors ${
                      selected
                        ? 'bg-white/20 font-16-md text-white'
                        : 'font-16-md text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="min-w-0">{option.label}</span>
                    {selected ? (
                      <Check className="size-5 shrink-0 text-highlight" strokeWidth={2} aria-hidden />
                    ) : (
                      <span className="size-5 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              )
            })}
            <li role="presentation" className="mx-3 my-1 h-px bg-white/15" aria-hidden />
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={data.selected === 'custom'}
                onClick={() => pick('custom')}
                className={`flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors ${
                  data.selected === 'custom'
                    ? 'bg-white/20 font-16-md text-white'
                    : 'font-16-md text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>직접 입력</span>
                {data.selected === 'custom' ? (
                  <Check className="size-5 shrink-0 text-highlight" strokeWidth={2} aria-hidden />
                ) : (
                  <span className="size-5 shrink-0" aria-hidden />
                )}
              </button>
            </li>
          </ul>
        )}

        {data.selected === 'custom' && (
          <CustomTextInput
            value={data.customValue}
            onChange={data.onCustomChange}
            placeholder="예: 1분 30초"
          />
        )}
      </div>
    </div>
  )
}
