'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'

export type TopNavTab = 'login'

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
]

export default function TopNavigation({ activeTab, className }: TopNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated } = useUserStore()

  // activeTab이 제공되지 않으면 pathname 기반으로 자동 감지
  const getActiveTab = (): TopNavTab | undefined => {
    if (activeTab) return activeTab
    
    if (pathname.includes('/login')) return 'login'
    
    return undefined
  }

  const currentActiveTab = getActiveTab()

  const handleTabClick = (path: string) => {
    router.push(path)
  }

  // 로그인 상태일 때는 아무것도 표시하지 않음
  if (isAuthenticated) {
    return null
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
