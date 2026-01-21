'use client'

import { useThemeStore } from '../store/useThemeStore'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  const theme = useThemeStore((state) => state.theme)

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
    </div>
  )
}

