import { ArrowRightIcon } from 'lucide-react'

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
      className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white disabled:opacity-20 transition-all"
    >
      <ArrowRightIcon size={12} />
    </button>
  )
}
