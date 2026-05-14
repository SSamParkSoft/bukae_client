'use client'

import { MessageSquareText, X } from 'lucide-react'

export interface FeedbackPromptContent {
  promptId: string
  title: string
  description: string
  ctaLabel?: string
}

interface FeedbackPromptBannerProps {
  content: FeedbackPromptContent
  feedbackUrl: string
  onClose: () => void
  onDismiss: () => void
  className?: string
}

export function FeedbackPromptBanner({
  content,
  feedbackUrl,
  onClose,
  onDismiss,
  className = '',
}: FeedbackPromptBannerProps) {
  const ctaLabel = content.ctaLabel ?? '의견 보내기'

  return (
    <section className={`rounded-lg border border-highlight/40 bg-highlight/10 px-5 py-4 shadow-[var(--shadow-feedback-prompt)] ${className}`}>
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-highlight text-brand">
            <MessageSquareText size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-16-md text-white">
              {content.title}
            </p>
            <p className="mt-1 font-14-rg text-white/70">
              {content.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <a
                href={feedbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-highlight px-4 font-14-sm text-brand transition-all hover:scale-[1.02] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
              >
                <MessageSquareText size={17} strokeWidth={2} aria-hidden="true" />
                <span>{ctaLabel}</span>
              </a>
              <button
                type="button"
                className="h-10 rounded-full px-3 font-14-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                onClick={onDismiss}
              >
                이번 프로젝트에서 보지 않기
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          onClick={onClose}
          aria-label="피드백 안내 닫기"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
