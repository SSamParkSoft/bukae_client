'use client'

import { useAnalysisPageContext } from '@/features/analysisPage/context/AnalysisPageContext'
import { ReferenceUrlTopBar } from './ReferenceUrlTopBar'

export function AnalysisReferenceUrlBar({ className }: { className?: string }) {
  const { referenceUrl } = useAnalysisPageContext()

  return (
    <ReferenceUrlTopBar referenceUrl={referenceUrl} className={className} />
  )
}
