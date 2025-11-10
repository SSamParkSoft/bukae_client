'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, BarChart3, User } from 'lucide-react'
import classNames from 'classnames'

const navigation = [
  { name: '메인', href: '/', icon: Home },
  { name: '영상 제작', href: '/video/create', icon: Video },
  { name: '통계', href: '/statistics', icon: BarChart3 },
  { name: '마이페이지', href: '/profile', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">📦 Bookae</h1>
        <p className="text-sm text-gray-500 mt-1">부업 자동화 서비스</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={classNames(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

