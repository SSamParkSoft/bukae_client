'use client'

import { cn } from '@/lib/utils'

export type EffectTab = 'animation' | 'bgm' | 'subtitle' | 'voice' | 'template' | 'sound'

interface EffectNavigationProps {
  activeTab: EffectTab
  onTabChange: (tab: EffectTab) => void
  className?: string
}

const tabs: { id: EffectTab; label: string }[] = [
  { id: 'animation', label: '애니메이션' },
  { id: 'bgm', label: '배경음악' },
  { id: 'subtitle', label: '자막' },
  { id: 'voice', label: '음성' },
  { id: 'template', label: '템플릿' },
  { id: 'sound', label: '효과음' },
]

export default function EffectNavigation({
  activeTab,
  onTabChange,
  className,
}: EffectNavigationProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-white/40 rounded-2xl p-1.5',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-bold transition-colors',
              isActive
                ? 'bg-[#5e8790] text-white'
                : 'bg-transparent text-[#5d5d5d] hover:bg-white/50'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
