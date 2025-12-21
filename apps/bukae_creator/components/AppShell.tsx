'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from './Sidebar'
import ThemeToggle from './ThemeToggle'
import { useUserStore } from '@/store/useUserStore'

const PUBLIC_PATHS = ['/login', '/signup', '/login/callback', '/oauth/callback']

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_PATHS.includes(pathname)
  const checkAuth = useUserStore((state) => state.checkAuth)

  // 초기 로드 시 자동 인증 확인하지 않음 (로그인 안된 상태로 시작)
  // 사용자가 명시적으로 로그인할 때만 인증 상태가 활성화됨

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64">{children}</main>
      </div>
      <ThemeToggle />
    </>
  )
}

