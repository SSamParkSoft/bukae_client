import type { PlanningConversationMessage } from '@/lib/types/domain'

export function getPlanningMessageTime(message: PlanningConversationMessage): number {
  const { createdAt } = message

  if (!createdAt) return 0
  if (createdAt instanceof Date) return createdAt.getTime()
  if (typeof createdAt === 'string') {
    const time = Date.parse(createdAt)
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}
