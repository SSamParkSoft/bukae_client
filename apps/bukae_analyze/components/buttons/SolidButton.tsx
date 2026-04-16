// 솔리드 버튼 — 라이트 CTA (브랜드 배경 위)
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
      className="px-6 py-2.5 text-sm font-medium bg-white text-brand rounded-md hover:bg-white/85 transition-colors"
      style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}
      tabIndex={hidden ? -1 : 0}
    >
      {children}
    </button>
  )
}
