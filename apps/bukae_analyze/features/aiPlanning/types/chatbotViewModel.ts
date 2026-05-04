import type { PlanningQuestionOption } from '@/lib/types/domain'

export interface FollowUpQuestion {
  questionId: string
  question: string
  responseType: string
  allowCustom: boolean
  customPlaceholder: string | null
  options: PlanningQuestionOption[]
}

export interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  kind: 'question' | 'answer' | 'status' | 'readyBrief' | 'error'
  text: string
  questionId?: string
  createdAt: string
}

export interface ReadyBriefViewModel {
  briefVersionId: string
  title: string
  planningSummary: string
  status: string
}

export interface FollowUpChatbotViewModel {
  messages: ChatMessage[]
  currentQuestions: FollowUpQuestion[]  // AI가 보낸 질문/메시지 목록 (표시용)
  readyBrief: ReadyBriefViewModel | null
  answer: string                         // 유저 단일 입력값
  isSubmitting: boolean
  isComplete: boolean
  onAnswerChange: (value: string) => void
  onSubmit: () => void
}
