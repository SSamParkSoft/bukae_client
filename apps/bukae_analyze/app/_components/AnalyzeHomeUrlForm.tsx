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
      <div className="border border-white/10 bg-white/10 backdrop-blur-[5px]" style={{ borderRadius: 'clamp(48px, 3.33vw, 64px)', paddingTop: 'clamp(8px, 0.625vw, 12px)', paddingBottom: 'clamp(8px, 0.625vw, 12px)', paddingLeft: 'clamp(24px, 1.67vw, 32px)', paddingRight: 'clamp(16px, 1.25vw, 24px)' }}>
        <div className="flex items-center" style={{ minHeight: 'clamp(48px, 3.33vw, 64px)', gap: 'clamp(8px, 0.625vw, 12px)' }}>
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
            className="inline-flex shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
            style={{ width: 'clamp(40px, 2.5vw, 48px)', height: 'clamp(40px, 2.5vw, 48px)' }}
            aria-label="분석 시작"
          >
            <Send style={{ width: 'clamp(24px, 1.67vw, 32px)', height: 'clamp(24px, 1.67vw, 32px)' }} strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </div>
    </form>
  )
}
