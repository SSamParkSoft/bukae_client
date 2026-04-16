'use client'

import { Send } from 'lucide-react'

const URL_PLACEHOLDER =
  'YouTube | Instagram | TikTok 레퍼런스 숏폼 URL를 입력하세요.'

export function AnalyzeHomeUrlForm({
  url,
  onUrlChange,
  onSubmit,
}: {
  url: string
  onUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} className="w-[70%] max-w-[1360px]">
      <label htmlFor="url-input" className="sr-only">
        레퍼런스 숏폼 URL
      </label>
      <div className="rounded-[48px] border border-white/10 bg-white/16 py-2 pl-6 pr-4 backdrop-blur-[5px] 2xl:rounded-[64px] 2xl:py-3 2xl:pl-8 2xl:pr-6">
        <div className="flex min-h-12 items-center gap-2 2xl:min-h-16 2xl:gap-3">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={onUrlChange}
            placeholder={URL_PLACEHOLDER}
            className="min-w-0 flex-1 bg-transparent font-20-rg text-white outline-none placeholder:text-white/60 2xl:font-24-rg"
            autoComplete="url"
            inputMode="url"
          />
          <button
            type="submit"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40 2xl:size-12"
            aria-label="분석 시작"
          >
            <Send className="size-6 2xl:size-8" strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  )
}
