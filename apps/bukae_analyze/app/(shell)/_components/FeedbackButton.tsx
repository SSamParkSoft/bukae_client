'use client'

import { MessageSquareText } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import type { CurrentUser } from '@/lib/services/auth'
import { buildFeedbackUrl } from '@/lib/utils/feedbackUrl'

interface FeedbackButtonProps {
  user: CurrentUser | null
}

export function FeedbackButton({ user }: FeedbackButtonProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const projectId = searchParams.get('projectId')
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

  const className = 'inline-flex h-11 items-center gap-2 rounded-full bg-highlight px-4 text-sm font-semibold text-brand shadow-[0_0_24px_rgba(174,255,250,0.22)] transition-all hover:scale-[1.02] hover:bg-white hover:shadow-[0_0_32px_rgba(174,255,250,0.32)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight'

  if (!feedbackUrl) {
    return (
      <button
        type="button"
        className={`${className} cursor-not-allowed opacity-50`}
        disabled
        title="피드백 폼 준비 중"
      >
        <MessageSquareText size={18} strokeWidth={2} aria-hidden="true" />
        <span>의견 보내기</span>
      </button>
    )
  }

  return (
    <a
      href={feedbackUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="의견 보내기"
    >
      <MessageSquareText size={18} strokeWidth={2} aria-hidden="true" />
      <span>의견 보내기</span>
    </a>
  )
}
