'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogIn, Video, BarChart3, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import ProfileDropdown from './ProfileDropdown'

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
  const { user, isAuthenticated } = useUserStore()

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

  // 로그인 상태일 때 피그마 디자인에 맞게 표시
  if (isAuthenticated && user) {
    return (
      <div className={cn('flex items-center gap-0 flex-nowrap shrink-0', className)}>
        {/* 프로필 드롭다운 */}
        <div className="shrink-0">
          <ProfileDropdown />
        </div>

        {/* 제작 버튼 */}
        <button
          onClick={() => handleTabClick('/video/create')}
          className={cn(
            'h-[58px] px-6 rounded-3xl text-base font-bold transition-colors flex items-center gap-2 justify-center shrink-0 whitespace-nowrap',
            currentActiveTab === 'make'
              ? 'bg-brand-teal text-white'
              : 'bg-transparent text-[#454545] hover:bg-gray-100'
          )}
        >
          <Video className="w-6 h-6 shrink-0" />
          제작
        </button>

        {/* 통계 버튼 */}
        <button
          onClick={() => handleTabClick('/statistics')}
          className={cn(
            'h-[58px] px-6 rounded-3xl text-base font-bold transition-colors flex items-center gap-2 justify-center shrink-0 whitespace-nowrap',
            currentActiveTab === 'data'
              ? 'bg-brand-teal text-white'
              : 'bg-transparent text-[#454545] hover:bg-gray-100'
          )}
        >
          <BarChart3 className="w-6 h-6 shrink-0" />
          통계
        </button>
      </div>
    )
  }

  // 로그인하지 않은 상태: 로그인 버튼만 표시
  return (
    <div className={cn('flex items-center flex-nowrap shrink-0', className)}>
      {tabs.map((tab) => {
        if (tab.id === 'login') {
          const isActive = currentActiveTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.path)}
              className={cn(
                'w-[140px] px-3 py-2 rounded-3xl text-sm font-bold transition-colors flex items-center gap-2 justify-center',
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
        return null
      })}
    </div>
  )
}
