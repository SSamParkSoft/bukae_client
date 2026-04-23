'use client'

import { AnalyzeHomeUrlForm } from '@/app/_components/AnalyzeHomeUrlForm'
import { useUrlInput } from '@/app/_hooks/useUrlInput'

export function AnalyzeHomeEntry() {
  const { url, handleChange, handleSubmit, isSubmitting } = useUrlInput()

  return (
    <AnalyzeHomeUrlForm
      url={url}
      onUrlChange={handleChange}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  )
}
