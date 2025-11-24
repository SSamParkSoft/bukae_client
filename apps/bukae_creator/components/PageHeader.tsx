'use client'

import { useRouter } from 'next/navigation'
import { useUserStore } from '../store/useUserStore'
import { useLogout } from '@/lib/hooks/useAuth'
import { useThemeStore } from '../store/useThemeStore'
import { User, LogOut, LogIn } from 'lucide-react'
import { Button } from './ui/button'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const { isAuthenticated, user, checkAuth } = useUserStore()
  const logout = useLogout()

  const handleLogout = () => {
    logout()
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
      
      <div className="flex items-center gap-3 ml-4">
        {isAuthenticated ? (
          <>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <User className={`w-4 h-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
              <span className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {user?.name || user?.email || '사용자'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>로그아웃</span>
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/login')}
            className="gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>로그인</span>
          </Button>
        )}
      </div>
    </div>
  )
}

