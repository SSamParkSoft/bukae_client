'use client'

import { LAYOUT } from './layout-constants'

export function Header() {
  return (
    <header
      className="w-full flex items-center justify-between px-10 border-b border-black/10 shrink-0"
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      {/* 로고 */}
      <div className="flex items-center">
        <span className="text-lg font-bold tracking-tight">BUKAE</span>
      </div>

      {/* 로그인 / 프로필 영역 (플레이스홀더) */}
      <div className="flex items-center">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium border border-black rounded-md hover:bg-black hover:text-white transition-colors"
        >
          로그인
        </button>
      </div>
    </header>
  )
}
