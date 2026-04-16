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
    <form onSubmit={onSubmit} className="w-full max-w-[1360px]">
      <label htmlFor="url-input" className="sr-only">
        레퍼런스 숏폼 URL
      </label>
      <div className="rounded-[64px] border border-white/10 bg-white/16 py-3 pl-8 pr-6 backdrop-blur-[5px]">
        <div className="flex min-h-16 items-center gap-3">
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={onUrlChange}
            placeholder={URL_PLACEHOLDER}
            className="min-w-0 flex-1 bg-transparent font-24-rg text-white outline-none placeholder:text-white/60"
            autoComplete="url"
            inputMode="url"
          />
          <button
            type="submit"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            aria-label="분석 시작"
          >
            <Send className="size-8" strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  )
}
