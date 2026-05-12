import type { FollowUpChatbotViewModel } from '@/features/aiPlanning/types/chatbotViewModel'
import { FollowUpChatbot } from './chatbotComponents'

export function FollowUpPlanningView({
  data,
}: {
  data: FollowUpChatbotViewModel
}) {
  return (
    <div className="relative h-full flex flex-col">
      <FollowUpChatbot data={data} />
    </div>
  )
}
