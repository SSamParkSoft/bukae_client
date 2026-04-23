'use client'

import { createContext, useContext } from 'react'
import type { AnalysisResourceSnapshotState } from '@/features/analysisPage/lib/analysisResource'
import { useAnalysisPage, type AnalysisPageState } from '../hooks/state/useAnalysisPage'

const AnalysisPageContext = createContext<AnalysisPageState | null>(null)

export function AnalysisPageProvider({
  initialProjectId,
  initialSnapshot,
  children,
}: {
  initialProjectId: string
  initialSnapshot?: AnalysisResourceSnapshotState | null
  children: React.ReactNode
}) {
  const value = useAnalysisPage(initialProjectId, initialSnapshot)

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
