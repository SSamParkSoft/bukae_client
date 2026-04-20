'use client'

import { AnalyzeHomeHeroCopy } from './_components/AnalyzeHomeHeroCopy'
import { AnalyzeHomeUrlForm } from './_components/AnalyzeHomeUrlForm'
import { useUrlInput } from './_hooks/useUrlInput'

export default function AnalyzeHomePage() {
  const { url, handleChange, handleSubmit } = useUrlInput()

  return (
    <div className="flex h-full min-h-0 flex-col items-center" style={{ marginTop: 'clamp(80px, 6.67vw, 128px)' }}>
      <div className="flex w-full flex-col items-center" style={{ gap: 'clamp(32px, 2.5vw, 48px)' }}>
        <AnalyzeHomeHeroCopy />
        <AnalyzeHomeUrlForm url={url} onUrlChange={handleChange} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
