interface QuestionHeaderProps {
  number: string
  question: string
}

export function QuestionHeader({ number, question }: QuestionHeaderProps) {
  return (
    <div className="mb-5">
      <span className="text-xs font-semibold text-black/30 tracking-widest uppercase">{number}</span>
      <p className="mt-1 text-base font-semibold text-black leading-snug">{question}</p>
    </div>
  )
}

interface InsightBoxProps {
  text: string
}

export function InsightBox({ text }: InsightBoxProps) {
  return (
    <div className="mb-4 px-4 py-3 rounded-lg bg-black/[0.03] border border-black/8">
      <p className="text-xs text-black/50 leading-relaxed">{text}</p>
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
          ? 'bg-black text-white border-black'
          : 'bg-white text-black border-black/15 hover:border-black/40'
      }`}
    >
      <span className={`shrink-0 text-xs font-bold ${selected ? 'text-white/60' : 'text-black/30'}`}>
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
        className="w-full px-4 py-3 rounded-lg border border-black/15 text-sm resize-none focus:outline-none focus:border-black/40 placeholder:text-black/25"
      />
    </div>
  )
}
