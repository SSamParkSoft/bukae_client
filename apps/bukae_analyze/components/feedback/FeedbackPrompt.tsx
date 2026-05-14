'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { dismissFeedbackPrompt, hasDismissedFeedbackPrompt } from '@/lib/storage/feedbackPromptStorage'
import { buildFeedbackUrl } from '@/lib/utils/feedbackUrl'
import { useAuthStore } from '@/store/useAuthStore'
import {
  FeedbackPromptBanner,
  type FeedbackPromptContent,
} from './FeedbackPromptBanner'

interface FeedbackPromptProps {
  projectId: string
  content: FeedbackPromptContent
  className?: string
}

function subscribeFeedbackPromptStore(): () => void {
  return () => {}
}

export function FeedbackPrompt({
  projectId,
  content,
  className,
}: FeedbackPromptProps) {
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

  if (!feedbackUrl || isClosed || isDismissedForProject) return null

  return (
    <FeedbackPromptBanner
      content={content}
      feedbackUrl={feedbackUrl}
      className={className}
      onClose={() => setClosedPromptKey(promptKey)}
      onDismiss={() => {
        dismissFeedbackPrompt(projectId)
        setClosedPromptKey(promptKey)
      }}
    />
  )
}

export type { FeedbackPromptContent }
