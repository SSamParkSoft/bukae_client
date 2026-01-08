'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export type TopNavTab = 'login' | 'make' | 'mypage' | 'data'

interface TopNavigationProps {
  activeTab?: TopNavTab
  className?: string
}

const tabs: { id: TopNavTab; label: string; path: string; icon?: string }[] = [
  { id: 'login', label: '로그인', path: '/login' },
  { id: 'make', label: '제작', path: '/video/create/step1' },
  { id: 'mypage', label: '마이페이지', path: '/profile' },
  { id: 'data', label: '통계', path: '/statistics' },
]

export default function TopNavigation({ activeTab, className }: TopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

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

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {tabs.map((tab) => {
        const isActive = currentActiveTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.path)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm font-bold transition-colors',
              isActive
                ? 'bg-[#5e8790] text-white'
                : 'bg-transparent text-[#454545] hover:bg-[#e4eeed]'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
