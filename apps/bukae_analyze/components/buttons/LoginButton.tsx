// 로그인 버튼 — 라이트 CTA (브랜드 배경 위)
export function LoginButton({
  onClick,
  children,
  type = 'button',
  style,
}: {
  onClick?: () => void
  children: React.ReactNode
  type?: 'button' | 'submit'
  style?: React.CSSProperties
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex items-center justify-center px-6 py-2.5 text-sm font-medium bg-white text-brand rounded-md hover:bg-white/85 transition-colors"
      style={style}
    >
      {children}
    </button>
  )
}
