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
        <span className="text-[clamp(16px,1.04vw,20px)] font-medium tracking-[-0.04em] leading-[1.4] text-white">{title}</span>
        <span className="text-[clamp(12px,0.83vw,16px)] font-medium tracking-[-0.04em] leading-[1.4] text-white/60">{subtitle}</span>
      </div>
    </div>
  )
}

interface IconButtonProps {
  icon?: LucideIcon
  label: string
  selected: boolean
  onClick: () => void
}

export function IconButton({ icon: Icon, label, selected, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 w-full px-6 py-3 rounded-lg backdrop-blur-[2px] text-left justify-between transition-colors ${
        selected
          ? 'bg-white/40 text-white'
          : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
      }`}
    >
      {Icon ? (
        <Icon className="shrink-0 size-8" strokeWidth={1.5} aria-hidden />
      ) : (
        <span className="shrink-0 size-8" aria-hidden />
      )}
      <span className="text-[clamp(12px,0.83vw,16px)] font-medium tracking-[-0.04em]">{label}</span>
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
        className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/5 text-[clamp(12px,0.83vw,16px)] font-normal tracking-[-0.04em] leading-[1.4] text-white resize-none focus:outline-none focus:border-white/50 placeholder:text-white/35"
      />
    </div>
  )
}
