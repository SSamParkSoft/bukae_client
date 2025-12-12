'use client'

import { useLayoutEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'

export default function ThemeInitializer() {
  const theme = useThemeStore((state) => state.theme)

  useLayoutEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  return null
}

