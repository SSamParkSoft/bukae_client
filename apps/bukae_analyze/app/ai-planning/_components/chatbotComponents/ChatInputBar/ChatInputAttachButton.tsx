import { PlusIcon } from 'lucide-react'

interface Props {
  onClick?: () => void
  disabled?: boolean
}

export function ChatInputAttachButton({ onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="첨부"
      className="size-12 flex items-center justify-center text-white/60 hover:text-white transition-colors disabled:opacity-40"
    >
      <PlusIcon size={28} strokeWidth={1.5} />
    </button>
  )
}
