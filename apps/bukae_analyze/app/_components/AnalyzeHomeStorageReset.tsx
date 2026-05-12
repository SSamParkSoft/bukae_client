'use client'

import { useEffect } from 'react'
import { clearAnalyzeWorkflowStorage } from '@/lib/storage/analyzeWorkflowStorage'

export function AnalyzeHomeStorageReset() {
  useEffect(() => {
    clearAnalyzeWorkflowStorage()
  }, [])

  return null
}
