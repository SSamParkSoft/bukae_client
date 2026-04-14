'use client'

import { useUrlInput } from './_hooks/useUrlInput'
import { SolidButton } from '@/components/buttons/SolidButton'

export default function AnalyzeHomePage() {
  const { url, handleChange, handleSubmit } = useUrlInput()

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-4">
        <label htmlFor="url-input" className="text-sm font-medium text-black">
          분석할 URL을 입력하세요
        </label>
        <div className="flex gap-2">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={handleChange}
            placeholder="https://..."
            className="flex-1 px-4 py-3 border border-black/20 rounded-md text-sm outline-none focus:border-black transition-colors"
          />
          <SolidButton type="submit">분석</SolidButton>
        </div>
      </form>
    </div>
  )
}
