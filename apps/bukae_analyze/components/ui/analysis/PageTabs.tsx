'use client'

interface Tab<T extends string> {
  id: T
  label: string
}

interface PageTabsProps<T extends string> {
  tabs: readonly Tab<T>[]
  activeTab: T
  onChange: (id: T) => void
}

export function PageTabs<T extends string>({ tabs, activeTab, onChange }: PageTabsProps<T>) {
  return (
    <div className="border-b border-black/10 flex gap-0 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'shrink-0 px-4 pb-3 text-sm font-medium transition-colors relative',
              isActive ? 'text-black' : 'text-black/40 hover:text-black/70',
            ].join(' ')}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-t-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
