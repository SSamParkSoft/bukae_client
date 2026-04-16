'use client'

import Link from 'next/link'
import { LAYOUT } from './layout-constants'
import logo from '@/public/logo.svg'
import Image from 'next/image'

export function Header() {
  return (
    <header
      className="w-full flex items-center justify-between px-18 shrink-0"
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      {/* 로고 — 홈으로 이동 */}
      <Link href="/" className="text-lg font-bold tracking-tight">
        <Image src={logo} alt="부캐 로고" />
      </Link>

      {/* 로그인 / 프로필 영역 (플레이스홀더) */}
      {/* todo : 디자인 추가 */}
      <div className="flex items-center">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium border border-white rounded-md text-white hover:bg-white hover:text-brand transition-colors"
        >
          로그인
        </button>
      </div>
    </header>
  )
}
