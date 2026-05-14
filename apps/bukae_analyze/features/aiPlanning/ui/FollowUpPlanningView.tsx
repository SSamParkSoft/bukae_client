import type { FollowUpChatbotViewModel } from '@/features/aiPlanning/types/chatbotViewModel'
import { FeedbackPromptBanner, type FeedbackPromptContent } from '@/components/feedback/FeedbackPromptBanner'
import { FollowUpChatbot } from './chatbotComponents'

export function FollowUpPlanningView({
  data,
  projectId,
  feedbackPrompt,
}: {
  data: FollowUpChatbotViewModel
  projectId: string
  feedbackPrompt?: FeedbackPromptContent
}) {
  const feedbackPromptBanner = feedbackPrompt ? (
    <FeedbackPromptBanner
      projectId={projectId}
      content={feedbackPrompt}
    />
  ) : null

  return (
    <div className="relative h-full flex flex-col">
      <FollowUpChatbot data={data} topContent={feedbackPromptBanner} />
    </div>
  )
}
