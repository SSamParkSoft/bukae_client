'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogIn, LogOut, Video, User, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import { authApi } from '@/lib/api/auth'
import Image from 'next/image'

export type TopNavTab = 'login' | 'make' | 'mypage' | 'data'

interface TopNavigationProps {
  activeTab?: TopNavTab
  className?: string
}

const tabs: { 
  id: TopNavTab
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'login', label: '로그인', path: '/login', icon: LogIn },
  { id: 'make', label: '제작', path: '/video/create', icon: Video },
  { id: 'mypage', label: '마이페이지', path: '/profile', icon: User },
  { id: 'data', label: '통계', path: '/statistics', icon: BarChart3 },
]

export default function TopNavigation({ activeTab, className }: TopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, reset } = useUserStore()

  // activeTab이 제공되지 않으면 pathname 기반으로 자동 감지
  const getActiveTab = (): TopNavTab | undefined => {
    if (activeTab) return activeTab
    
    if (pathname.includes('/login')) return 'login'
    if (pathname.includes('/video/create') || pathname.includes('/video/create/')) return 'make'
    if (pathname.includes('/profile')) return 'mypage'
    if (pathname.includes('/statistics')) return 'data'
    
    return undefined
  }

  const currentActiveTab = getActiveTab()

  const handleTabClick = (path: string) => {
    router.push(path)
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
      reset()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {tabs.map((tab) => {
        // 로그인 버튼은 로그인 상태에 따라 다르게 표시
        if (tab.id === 'login') {
          if (isAuthenticated && user) {
            return (
              <div key="profile-section" className="flex items-center gap-2">
                {/* 프로필 사진과 사용자 이름 (로그인 버튼 왼쪽) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
                  {user.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-brand-teal-light flex items-center justify-center shrink-0">
                      <span className="text-white text-sm font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-bold text-text-muted whitespace-nowrap">{user.name}</span>
                </div>
                {/* 로그아웃 버튼 (원래 로그인 버튼 위치) */}
                <button
                  onClick={handleLogout}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2',
                    'bg-transparent text-text-muted hover:bg-brand-hover'
                  )}
                >
                  <LogOut className="w-6 h-6" />
                  로그아웃
                </button>
              </div>
            )
          } else {
            // 로그인 버튼 (로그인 상태가 아닐 때)
            const isActive = currentActiveTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2',
                  isActive
                    ? 'bg-brand-teal text-white'
                    : 'bg-transparent text-text-muted hover:bg-brand-hover'
                )}
              >
                <Icon className="w-6 h-6" />
                {tab.label}
              </button>
            )
          }
        }

        // 다른 탭들은 그대로 표시
        const isActive = currentActiveTab === tab.id
        const Icon = tab.icon

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.path)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2',
              isActive
                ? 'bg-brand-teal text-white'
                : 'bg-transparent text-text-muted hover:bg-brand-hover'
            )}
          >
            <Icon className="w-6 h-6" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
