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
      <div className="rounded-[clamp(48px,3.33vw,64px)] border border-white/10 bg-white/16 py-[clamp(8px,0.625vw,12px)] pl-[clamp(24px,1.67vw,32px)] pr-[clamp(16px,1.25vw,24px)] backdrop-blur-[5px]">
        <div className="flex min-h-[clamp(48px,3.33vw,64px)] items-center gap-[clamp(8px,0.625vw,12px)]">
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
            className="inline-flex size-[clamp(40px,2.5vw,48px)] shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            aria-label="분석 시작"
          >
            <Send className="size-[clamp(24px,1.67vw,32px)]" strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  )
}
