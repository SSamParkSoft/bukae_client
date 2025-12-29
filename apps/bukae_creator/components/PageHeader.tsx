'use client'

import { useRouter } from 'next/navigation'
import { useUserStore } from '../store/useUserStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { useThemeStore } from '../store/useThemeStore'
import { LogOut } from 'lucide-react'
import { Button } from './ui/button'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const { isAuthenticated, checkAuth } = useUserStore()
  const logout = useLogout()

  const handleLogout = async () => {
    await logout()
    checkAuth()
    router.push('/login')
  }

  return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex-1">
        <h1 className={`text-3xl font-bold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {title}
        </h1>
        {description && (
          <p className={`${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {description}
          </p>
        )}
        {children}
      </div>
      
      {isAuthenticated ? (
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </Button>
      ) : null}
    </div>
  )
}

