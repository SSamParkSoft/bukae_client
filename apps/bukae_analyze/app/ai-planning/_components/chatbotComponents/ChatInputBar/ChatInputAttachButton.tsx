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
      className="w-7 h-7 rounded-full border border-black/15 flex items-center justify-center text-black/30 hover:text-black/60 transition-colors disabled:opacity-40"
    >
      <PlusIcon size={12} />
    </button>
  )
}
