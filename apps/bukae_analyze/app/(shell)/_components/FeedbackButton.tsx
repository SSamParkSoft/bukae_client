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

  const className = 'inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3 font-14-md text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white'

  if (!feedbackUrl) {
    return (
      <button
        type="button"
        className={`${className} cursor-not-allowed opacity-50`}
        disabled
        title="피드백 폼 준비 중"
      >
        <MessageSquareText size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>피드백</span>
      </button>
    )
  }

  return (
    <a
      href={feedbackUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title="피드백 보내기"
    >
      <MessageSquareText size={16} strokeWidth={1.8} aria-hidden="true" />
      <span>피드백</span>
    </a>
  )
}
