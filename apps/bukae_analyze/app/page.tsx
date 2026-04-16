'use client'

import { AnalyzeHomeHeroCopy } from './_components/AnalyzeHomeHeroCopy'
import { AnalyzeHomeUrlForm } from './_components/AnalyzeHomeUrlForm'
import { useUrlInput } from './_hooks/useUrlInput'

export default function AnalyzeHomePage() {
  const { url, handleChange, handleSubmit } = useUrlInput()

  return (
    <div className="flex h-full min-h-0 flex-col items-center mt-20 2xl:mt-32">
      <div className="flex w-full flex-col items-center gap-8 py-8 2xl:gap-12">
        <AnalyzeHomeHeroCopy />
        <AnalyzeHomeUrlForm url={url} onUrlChange={handleChange} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
