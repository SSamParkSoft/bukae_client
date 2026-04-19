import { SendIcon } from 'lucide-react'

interface Props {
  onClick: () => void
  disabled: boolean
}

export function ChatInputSubmitButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="전송"
      className="flex items-center justify-center text-white/60 hover:text-white disabled:opacity-25 transition-colors"
      style={{ width: 'clamp(32px, 2.5vw, 48px)', height: 'clamp(32px, 2.5vw, 48px)' }}
    >
      <SendIcon strokeWidth={1.5} style={{ width: 'clamp(20px, 1.46vw, 28px)', height: 'clamp(20px, 1.46vw, 28px)' }} />
    </button>
  )
}
