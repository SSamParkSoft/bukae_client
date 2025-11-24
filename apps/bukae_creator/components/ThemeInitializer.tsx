'use client'

import { useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeInitializer() {
  const setTheme = useThemeStore((state) => state.setTheme)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    // 초기 테마 설정
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return null
}

