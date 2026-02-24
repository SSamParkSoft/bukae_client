'use client'

import { Sun, Moon } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  // 마운트 전에는 항상 light 테마로 렌더링 (서버와 클라이언트 일치)
  const displayTheme = mounted ? theme : 'light'

  return (
    <button
      onClick={toggleTheme}
      className={`fixed bottom-6 right-6 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${
        displayTheme === 'dark'
          ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
          : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
      }`}
      aria-label="테마 전환"
    >
      {displayTheme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
