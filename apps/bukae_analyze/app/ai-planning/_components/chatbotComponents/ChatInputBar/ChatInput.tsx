interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function ChatInput({ value, onChange, placeholder = '입력' }: Props) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      onInput={e => {
        const el = e.currentTarget
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }}
      className="flex-1 bg-transparent font-20-rg text-white placeholder:text-white/40 resize-none focus:outline-none min-h-[28px] max-h-[120px] py-0"
    />
  )
}
