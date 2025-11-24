import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const getStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem('bookae-theme')
  return (stored === 'dark' || stored === 'light') ? stored : 'light'
}

const setStoredTheme = (theme: Theme) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bookae-theme', theme)
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  const initialTheme = getStoredTheme()
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', initialTheme)
  }

  return {
    theme: initialTheme,
    toggleTheme: () =>
      set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light'
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', newTheme)
        }
        setStoredTheme(newTheme)
        return { theme: newTheme }
      }),
    setTheme: (theme) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme)
      }
      setStoredTheme(theme)
      set({ theme })
    },
  }
})

