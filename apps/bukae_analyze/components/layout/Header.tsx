'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LAYOUT } from './layout-constants'
import logo from '@/public/logo.svg'
import { useAuthStore } from '@/store/useAuthStore'

function UserProfile({ name, profileImageUrl }: { name: string; profileImageUrl: string | null }) {
  return (
    <div className="flex items-center gap-2">
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
    </div>
  )
}

export function Header() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  return (
    <header
      className="w-full flex items-center justify-between px-18 shrink-0"
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      <Link href="/" className="text-lg font-bold tracking-tight">
        <Image src={logo} alt="부캐 로고" />
      </Link>

      <div className="flex items-center">
        {accessToken && user ? (
          <UserProfile name={user.name} profileImageUrl={user.profileImageUrl} />
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-regular text-white hover:bg-white/10 backdrop-blur-[2px] rounded-full"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  )
}
