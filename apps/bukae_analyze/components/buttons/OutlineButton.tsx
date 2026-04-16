// 아웃라인 버튼 — 기본 테두리, hover 시 배경 반전
export function OutlineButton({
  onClick,
  children,
  type = 'button',
  hidden = false,
}: {
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit'
  hidden?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="px-6 py-2.5 text-sm font-medium border border-white rounded-md text-white hover:bg-white hover:text-brand transition-colors"
      style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}
      tabIndex={hidden ? -1 : 0}
    >
      {children}
    </button>
  )
}
