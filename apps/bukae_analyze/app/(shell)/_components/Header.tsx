'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { CurrentUser } from '@/lib/services/auth'
import { LAYOUT } from '@/lib/config/layout'
import logo from '@/public/logo.svg'
import { useAuthStore } from '@/store/useAuthStore'
import { useHeaderProfile } from '@/features/auth/hooks/state/useHeaderProfile'
import { FeedbackButton } from './FeedbackButton'

function UserProfileMenu({ initialUser }: { initialUser: CurrentUser | null }) {
  const { name, profileImageUrl, handleLogout } = useHeaderProfile(initialUser)

  return (
    <div className="group relative">
      {/* 프로필 */}
      <button type="button" className="flex cursor-pointer items-center gap-2" aria-haspopup="menu">
        {profileImageUrl ? (
          <Image
            src={profileImageUrl}
            alt={name}
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 font-14-md text-white">
            {name.charAt(0)}
          </div>
        )}
        <span className="font-14-md text-white">{name}</span>
      </button>

      {/* 호버/포커스 드롭다운 */}
      <div className="pointer-events-none absolute right-0 top-full pt-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
        <div className="min-w-[120px] overflow-hidden rounded-xl border border-white/10 bg-brand/90 backdrop-glass-soft">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left font-14-md text-white/80 hover:bg-white/10 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}

export function Header({
  isAuthenticated = false,
  initialUser = null,
}: {
  isAuthenticated?: boolean
  initialUser?: CurrentUser | null
}) {
  const user = useAuthStore((s) => s.user)
  const resolvedUser = user ?? initialUser

  return (
    <header
      className="w-full flex items-center justify-between px-18 shrink-0"
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      <Link href="/" className="text-lg font-bold tracking-tight">
        <Image src={logo} alt="부캐 로고" />
      </Link>

      <div className="flex items-center gap-3">
        <FeedbackButton user={resolvedUser} />
        {resolvedUser ? (
          <UserProfileMenu initialUser={resolvedUser} />
        ) : !isAuthenticated ? (
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-regular text-white hover:bg-white/10 backdrop-blur-[2px] rounded-full"
          >
            로그인
          </Link>
        ) : (
          <div className="h-8 w-[120px]" />
        )}
      </div>
    </header>
  )
}
