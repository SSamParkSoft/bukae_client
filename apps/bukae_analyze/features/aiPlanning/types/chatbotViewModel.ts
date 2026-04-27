export interface FollowUpQuestion {
  questionId: string
  question: string
}

export interface ChatMessage {
  role: 'ai' | 'user'
  text: string
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
