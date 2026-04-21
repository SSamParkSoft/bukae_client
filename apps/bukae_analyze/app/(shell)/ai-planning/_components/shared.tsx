'use client'

import type { AiQuestionViewModel } from '@/features/aiPlanning/types/viewModel'

// ---- QuestionBlock (새 디자인) ----

export function QuestionBlock({ data }: { data: AiQuestionViewModel }) {
  const allOptions = [
    ...data.options,
    ...(data.hasCustomOption ? [{ value: 'custom', label: '직접 입력' }] : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          {data.questionNumber}
        </p>
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
          {data.questionText}
        </p>
        <div className="backdrop-blur-[2px] border-b border-white/20 py-3 w-full">
          <p className="font-medium tracking-[-0.04em] text-white/80 leading-[1.8] line-clamp-2" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
            {data.referenceInsight}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {allOptions.map((option, i) => {
          const isSelected = data.selected === option.value
          const letter = String.fromCharCode(97 + i)
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => data.onSelect(option.value)}
              className={[
                'backdrop-blur-[2px] flex items-center gap-4 px-6 py-3 rounded-[8px] transition-colors',
                isSelected ? 'bg-white/32' : 'bg-white/08 hover:bg-white/15',
              ].join(' ')}
            >
              <span
                style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}
              className={[
                  'shrink-0 font-medium tracking-[-0.04em] leading-[1.4] whitespace-nowrap',
                  isSelected ? 'text-white' : 'text-white/40',
                ].join(' ')}
              >
                {letter}.
              </span>
              <span
                style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
              className={[
                  'flex-1 min-w-0 font-medium tracking-[-0.04em] leading-[1.4] text-left',
                  isSelected ? 'text-white' : 'text-white/40',
                ].join(' ')}
              >
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {data.selected === 'custom' && (
        <textarea
          value={data.customValue}
          onChange={e => data.onCustomChange(e.target.value)}
          placeholder={data.customPlaceholder}
          rows={2}
          className="w-full px-6 py-3 rounded-[8px] border border-white/40 bg-transparent font-medium tracking-[-0.04em] text-white resize-none focus:outline-none focus:border-white/60 placeholder:text-white/35"
          style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
        />
      )}
    </div>
  )
}

// ---- 레거시 컴포넌트 (기존 개별 질문 컴포넌트용) ----

interface QuestionHeaderProps {
  number: string
  question: string
}

export function QuestionHeader({ number, question }: QuestionHeaderProps) {
  return (
    <div className="mb-5">
      <span className="text-xs font-semibold text-white/30 tracking-widest uppercase">{number}</span>
      <p className="mt-1 text-base font-semibold text-white leading-snug">{question}</p>
    </div>
  )
}

interface InsightBoxProps {
  text: string
}

export function InsightBox({ text }: InsightBoxProps) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-white/6 border border-white/10">
      <p className="text-xs text-white/50 leading-relaxed">{text}</p>
    </div>
  )
}

interface OptionButtonProps {
  letter: string
  label: string
  selected: boolean
  onClick: () => void
}

export function OptionButton({ letter, label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg border text-sm text-left transition-colors ${
        selected
          ? 'bg-white text-brand border-white'
          : 'bg-white/10 text-white border-white/20 hover:border-white/50'
      }`}
    >
      <span className={`shrink-0 text-xs font-bold ${selected ? 'text-brand/60' : 'text-white/40'}`}>
        {letter}.
      </span>
      <span>{label}</span>
    </button>
  )
}

interface CustomTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function CustomTextInput({ value, onChange, placeholder = '직접 입력해 주세요.' }: CustomTextInputProps) {
  return (
    <div className="mt-2">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-sm text-white resize-none focus:outline-none focus:border-white/50 placeholder:text-white/35"
      />
    </div>
  )
}
