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

  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    if (!isPublicRoute) {
      checkAuth()
    }
  }, [isPublicRoute, checkAuth])

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

