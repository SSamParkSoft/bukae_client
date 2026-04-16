'use client'

import { useUrlInput } from './_hooks/useUrlInput'
import { SolidButton } from '@/components/buttons/SolidButton'

export default function AnalyzeHomePage() {
  const { url, handleChange, handleSubmit } = useUrlInput()

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
        <label htmlFor="url-input" className="text-sm font-medium text-white">
          분석할 URL을 입력하세요
        </label>
        <div className="flex gap-2">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="https://..."
            className="flex-1 px-4 py-3 border border-white/25 rounded-md text-sm text-white bg-white/5 outline-none focus:border-white/60 transition-colors placeholder:text-white/35"
          />
          <SolidButton type="submit">분석</SolidButton>
        </div>
      </form>
    </div>
  )
}
