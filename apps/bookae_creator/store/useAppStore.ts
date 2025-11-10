import { create } from 'zustand'

interface AppState {
  productUrl: string
  setProductUrl: (url: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  productUrl: '',
  setProductUrl: (url) => set({ productUrl: url }),
}))