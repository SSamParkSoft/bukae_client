interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
  disabled?: boolean
}

export function ChatInput({ value, onChange, placeholder = '입력', onSubmit, disabled }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (!disabled) onSubmit?.()
    }
  }

  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      onInput={e => {
        const el = e.currentTarget
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      }}
      className="flex-1 bg-transparent font-regular tracking-[-0.04em] leading-[1.4] text-white placeholder:text-white/40 resize-none focus:outline-none min-h-[28px] max-h-[120px] justify-center"
      style={{ fontSize: 'clamp(16px, 1.17vw, 20px)' }}
    />
  )
}
