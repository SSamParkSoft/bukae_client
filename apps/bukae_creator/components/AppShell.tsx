'use client'

import { usePathname } from 'next/navigation'
import BukaeTop from './BukaeTop'

const PUBLIC_PATHS = ['/login', '/signup', '/login/callback', '/oauth/callback']

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isPublicRoute = PUBLIC_PATHS.includes(pathname)

  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-background-start to-brand-background-end">
      <BukaeTop />
      <main>{children}</main>
    </div>
  )
}

