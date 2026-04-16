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
