'use client'

import { useEffect } from 'react'
import { clearAnalyzeWorkflowStorage } from '@/components/workflow/lib/analyzeWorkflowStorage'

export function AnalyzeHomeStorageReset() {
  useEffect(() => {
    clearAnalyzeWorkflowStorage()
  }, [])

  return null
}
