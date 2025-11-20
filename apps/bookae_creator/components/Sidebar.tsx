'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Video, BarChart3, User, LogIn, LogOut } from 'lucide-react'
import classNames from 'classnames'
import { AnimatePresence, motion } from 'framer-motion'
import { useThemeStore } from '../store/useThemeStore'
import { useUserStore } from '../store/useUserStore'
import { useLogout } from '@/lib/hooks/useAuth'

const navigation = [
  { name: '메인', href: '/', icon: Home },
  { name: '영상 제작', href: '/video/create', icon: Video },
  { name: '통계', href: '/statistics', icon: BarChart3 },
  { name: '마이페이지', href: '/profile', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const theme = useThemeStore((state) => state.theme)
  const { isAuthenticated, checkAuth } = useUserStore()
  const logout = useLogout()

  const handleLogout = () => {
    logout()
    checkAuth()
    router.push('/login')
  }

  return (
    <aside className={`fixed left-0 top-0 h-full w-64 border-r flex flex-col transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white border-gray-200'
    }`}>
      <div className={`p-6 border-b ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        <h1 className={`text-xl font-bold ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>📦 Bookae</h1>
        <p className={`text-sm mt-1 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`}>부업 자동화 서비스</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          // 정확히 일치하거나 하위 경로인지 확인 (단, 루트 경로는 정확히 일치해야 함)
          const isActive = item.href === '/'
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                'group relative flex items-center gap-3 px-4 py-3 rounded-lg overflow-hidden transition-colors duration-200',
                isActive
                  ? theme === 'dark'
                    ? 'text-purple-200 font-medium'
                    : 'text-purple-700 font-medium'
                  : theme === 'dark'
                    ? 'text-gray-300 hover:bg-gray-800/80'
                    : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <AnimatePresence initial={false}>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className={classNames(
                      'absolute inset-0 rounded-lg pointer-events-none',
                      theme === 'dark'
                        ? 'bg-purple-900/40'
                        : 'bg-purple-100'
                    )}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.55 }}
                  />
                )}
              </AnimatePresence>
              <motion.span
                layout
                className="relative z-10 flex items-center gap-3 w-full"
                transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.55 }}
              >
                <Icon
                  className={classNames(
                    'w-5 h-5 transition-colors duration-200',
                    isActive
                      ? theme === 'dark'
                        ? 'text-purple-100'
                        : 'text-purple-600'
                      : theme === 'dark'
                        ? 'text-gray-400 group-hover:text-gray-200'
                        : 'text-gray-500 group-hover:text-gray-800'
                  )}
                />
                <span className="transition-colors duration-200">{item.name}</span>
              </motion.span>
            </Link>
          )
        })}
      </nav>

      {/* 로그인/로그아웃 버튼 */}
      <div className={`p-4 border-t ${
        theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }`}>
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className={classNames(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-800/80'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <LogOut className="w-5 h-5" />
            <span>로그아웃</span>
          </button>
        ) : (
          <Link
            href="/login"
            className={classNames(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              theme === 'dark'
                ? 'text-gray-300 hover:bg-gray-800/80'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <LogIn className="w-5 h-5" />
            <span>로그인</span>
          </Link>
        )}
      </div>
    </aside>
  )
}

