'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import type { VideoLength } from '@/lib/types/domain'
import type { QuestionSectionViewModel } from '@/features/planningSetup/types/viewModel'
import { SectionHeader, CustomTextInput, DropdownTrigger, DropdownListbox } from './PlanningSetupPrimitives'

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

function useVideoLengthDropdown(onSelect: (value: VideoLength | 'custom') => void) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(value => !value), [])
  const pick = useCallback((value: VideoLength | 'custom') => {
    onSelect(value)
    setOpen(false)
  }, [onSelect])

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

  return { open, pick, rootRef, toggle }
}

interface Props {
  data: QuestionSectionViewModel<VideoLength>
}

export function VideoLengthQuestion({ data }: Props) {
  const { open, pick, rootRef, toggle } = useVideoLengthDropdown(data.onSelect)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={Clock}
        title="목표 영상 길이"
        subtitle="최종 영상의 길이를 선택하세요."
      />
      <div ref={rootRef} className="relative flex flex-col gap-4">
        <DropdownTrigger
          label={triggerLabel(data)}
          isPlaceholder={data.selected === null}
          isOpen={open}
          onClick={toggle}
        />
        {open && (
          <DropdownListbox
            options={OPTIONS}
            selectedValue={data.selected}
            onPick={(value) => pick(value as VideoLength | 'custom')}
            hasCustomOption
          />
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
