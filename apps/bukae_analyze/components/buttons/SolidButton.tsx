// 솔리드 버튼 — 검정 배경, hover 시 밝아짐
export function SolidButton({
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
      className="px-6 py-2.5 text-sm font-medium bg-black text-white rounded-md hover:bg-black/80 transition-colors"
      style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}
      tabIndex={hidden ? -1 : 0}
    >
      {children}
    </button>
  )
}
