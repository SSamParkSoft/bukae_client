export interface FollowUpQuestion {
  questionId: string
  question: string
}

export interface ChatMessage {
  role: 'ai' | 'user'
  text: string
}

export interface Exchange {
  aiTexts: string[]
  userAnswers: string[]
}

export interface FollowUpChatbotViewModel {
  exchanges: Exchange[]
  currentQuestions: FollowUpQuestion[]
  answers: Record<string, string>
  isSubmitting: boolean
  isComplete: boolean
  onAnswerChange: (questionId: string, value: string) => void
  onSubmit: () => void
  onServerResponse: (nextQuestions: FollowUpQuestion[], aiText: string, done: boolean) => void
}
