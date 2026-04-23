'use client'

import { createContext, useContext } from 'react'
import { useAnalysisPage, type AnalysisPageState } from '../hooks/state/useAnalysisPage'

const AnalysisPageContext = createContext<AnalysisPageState | null>(null)

export function AnalysisPageProvider({
  initialProjectId,
  children,
}: {
  initialProjectId: string | null
  children: React.ReactNode
}) {
  const value = useAnalysisPage(initialProjectId)

  return (
    <AnalysisPageContext.Provider value={value}>
      {children}
    </AnalysisPageContext.Provider>
  )
}

export function useAnalysisPageContext(): AnalysisPageState {
  const context = useContext(AnalysisPageContext)

  if (!context) {
    throw new Error('useAnalysisPageContext must be used within AnalysisPageProvider')
  }

  return context
}
