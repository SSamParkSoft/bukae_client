'use client'

import { MessageSquareText, X } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { dismissFeedbackPrompt, hasDismissedFeedbackPrompt } from '@/lib/storage/feedbackPromptStorage'
import { buildFeedbackUrl } from '@/lib/utils/feedbackUrl'
import { useAuthStore } from '@/store/useAuthStore'

export interface FeedbackPromptContent {
  promptId: string
  title: string
  description: string
  ctaLabel?: string
}

interface FeedbackPromptBannerProps {
  projectId: string
  content: FeedbackPromptContent
  className?: string
}

function subscribeFeedbackPromptStore(): () => void {
  return () => {}
}

export function FeedbackPromptBanner({
  projectId,
  content,
  className = '',
}: FeedbackPromptBannerProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const user = useAuthStore((state) => state.user)
  const promptKey = `${content.promptId}:${projectId}`
  const [closedPromptKey, setClosedPromptKey] = useState<string | null>(null)
  const isDismissedForProject = useSyncExternalStore(
    subscribeFeedbackPromptStore,
    () => hasDismissedFeedbackPrompt(projectId),
    () => true
  )
  const feedbackUrl = useMemo(
    () =>
      buildFeedbackUrl(
        {
          formUrl: process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL,
          currentPageEntryId: process.env.NEXT_PUBLIC_FEEDBACK_FORM_CURRENT_PAGE_ENTRY_ID,
          projectIdEntryId: process.env.NEXT_PUBLIC_FEEDBACK_FORM_PROJECT_ID_ENTRY_ID,
          userNameEntryId: process.env.NEXT_PUBLIC_FEEDBACK_FORM_USER_NAME_ENTRY_ID,
          userEmailEntryId: process.env.NEXT_PUBLIC_FEEDBACK_FORM_USER_EMAIL_ENTRY_ID,
        },
        {
          pathname,
          search: queryString,
          projectId,
          userName: user?.name,
          userEmail: user?.email,
        }
      ),
    [pathname, projectId, queryString, user?.email, user?.name]
  )
  const isClosed = closedPromptKey === promptKey
  const isVisible = Boolean(feedbackUrl) && !isClosed && !isDismissedForProject
  const ctaLabel = content.ctaLabel ?? '의견 보내기'

  if (!isVisible || !feedbackUrl) return null

  return (
    <section className={`rounded-lg border border-highlight/40 bg-highlight/10 px-5 py-4 shadow-[0_0_30px_rgba(174,255,250,0.12)] ${className}`}>
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
                className="inline-flex h-10 items-center gap-2 rounded-full bg-highlight px-4 text-sm font-semibold text-brand transition-all hover:scale-[1.02] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight"
              >
                <MessageSquareText size={17} strokeWidth={2} aria-hidden="true" />
                <span>{ctaLabel}</span>
              </a>
              <button
                type="button"
                className="h-10 rounded-full px-3 font-14-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => {
                  dismissFeedbackPrompt(projectId)
                  setClosedPromptKey(promptKey)
                }}
              >
                이번 프로젝트에서 보지 않기
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => setClosedPromptKey(promptKey)}
          aria-label="피드백 안내 닫기"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
