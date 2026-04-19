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
      className="size-12 flex items-center justify-center text-white/60 hover:text-white disabled:opacity-25 transition-colors"
    >
      <SendIcon size={28} strokeWidth={1.5} />
    </button>
  )
}
