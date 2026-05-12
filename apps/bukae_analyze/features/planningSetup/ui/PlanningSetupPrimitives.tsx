import { Check, ChevronDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  icon: LucideIcon
  title: string
  subtitle: string
}

export function SectionHeader({ icon: Icon, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0 size-12 rounded-[12px] bg-white/10 backdrop-blur-[2px] flex items-center justify-center">
        <Icon className="size-6 text-white" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="flex flex-col">
        <span className="font-medium tracking-[-0.04em] leading-[1.4] text-white" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>{title}</span>
        <span className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}>{subtitle}</span>
      </div>
    </div>
  )
}

interface IconButtonProps {
  icon?: LucideIcon
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function IconButton({
  icon: Icon,
  label,
  selected,
  onClick,
  disabled = false,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-4 w-full px-6 py-3 rounded-lg backdrop-blur-[2px] text-left justify-between transition-colors ${
        selected
          ? 'bg-white/40 text-white'
          : disabled
            ? 'bg-white/6 text-white/30 cursor-not-allowed'
            : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
      }`}
    >
      {Icon ? (
        <Icon className="shrink-0 size-8" strokeWidth={1.5} aria-hidden />
      ) : (
        <span className="shrink-0 size-8" aria-hidden />
      )}
      <span className="font-medium tracking-[-0.04em]" style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}>{label}</span>
    </button>
  )
}

export function DropdownTrigger({
  label,
  isPlaceholder,
  isOpen,
  onClick,
}: {
  label: string
  isPlaceholder: boolean
  isOpen: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      onClick={onClick}
      className={`flex h-[60px] w-full items-center justify-between gap-3 rounded-lg border px-6 backdrop-blur-[2px] transition-colors focus:outline-none focus-visible:border-highlight/60 focus-visible:ring-2 focus-visible:ring-highlight/25 ${
        isOpen
          ? 'border-white/60 bg-white/15 text-white'
          : 'border-white/40 bg-white/5 text-white hover:border-white/50 hover:bg-white/10'
      }`}
    >
      <span
        style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}
        className={`min-w-0 truncate text-left font-medium tracking-[-0.04em] leading-[1.4] ${isPlaceholder ? 'text-white/50' : 'text-white/90'}`}
      >
        {label}
      </span>
      <ChevronDown
        className={`size-5 shrink-0 text-white/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        strokeWidth={1.5}
        aria-hidden
      />
    </button>
  )
}

export function DropdownListbox({
  options,
  selectedValue,
  onPick,
  hasCustomOption = false,
}: {
  options: Array<{ value: string; label: string }>
  selectedValue: string | null
  onPick: (value: string | 'custom') => void
  hasCustomOption?: boolean
}) {
  return (
    <ul
      role="listbox"
      className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 overflow-hidden rounded-lg border border-white/20 bg-brand/95 py-1 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-glass-soft"
    >
      {options.map((option) => {
        const selected = selectedValue === option.value
        return (
          <li key={option.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onPick(option.value)}
              style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}
              className={`flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors ${
                selected
                  ? 'bg-white/20 font-medium tracking-[-0.04em] text-white'
                  : 'font-medium tracking-[-0.04em] text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="min-w-0">{option.label}</span>
              {selected
                ? <Check className="size-5 shrink-0 text-highlight" strokeWidth={2} aria-hidden />
                : <span className="size-5 shrink-0" aria-hidden />
              }
            </button>
          </li>
        )
      })}
      {hasCustomOption && (
        <>
          <li role="presentation" className="mx-3 my-1 h-px bg-white/15" aria-hidden />
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={selectedValue === 'custom'}
              onClick={() => onPick('custom')}
              className={`flex w-full items-center justify-between gap-3 px-6 py-3 text-left transition-colors font-16-md ${
                selectedValue === 'custom'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>직접 입력</span>
              {selectedValue === 'custom'
                ? <Check className="size-5 shrink-0 text-highlight" strokeWidth={2} aria-hidden />
                : <span className="size-5 shrink-0" aria-hidden />
              }
            </button>
          </li>
        </>
      )}
    </ul>
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
        className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 font-normal tracking-[-0.04em] leading-[1.4] text-white resize-none focus:outline-none focus:border-white/50 placeholder:text-white/35"
        style={{ fontSize: 'clamp(12px, 0.83vw, 16px)' }}
      />
    </div>
  )
}
