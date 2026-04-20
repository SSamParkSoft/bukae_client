'use client'

import { useState, useMemo } from 'react'
import type { FollowUpQuestion, ChatMessage, FollowUpChatbotViewModel } from '../../types/chatbotViewModel'

// step 0 → q1, step 1 → q2, step 2 → q3 (라운드 경계: step 1 제출 후 AI 중간 메시지 + q3)
const MOCK_QUESTIONS: FollowUpQuestion[] = [
  { questionId: 'q1', question: '영상에서 가장 강조하고 싶은 감정이나 분위기가 있나요?' },
  { questionId: 'q2', question: '타겟 시청자의 주된 고민이나 관심사는 무엇인가요?' },
  { questionId: 'q3', question: '비슷한 영상 중 참고하고 싶은 스타일이 있다면 설명해 주세요.' },
]

export function useFollowUpChatbot(): FollowUpChatbotViewModel {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '답변 내용만으로는 기획 방향을 확정하기 어려워요. 조금 더 여쭤볼게요!' },
  ])
  const [currentQuestions, setCurrentQuestions] = useState<FollowUpQuestion[]>([MOCK_QUESTIONS[0]])
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [step, setStep] = useState(0)

  // TODO: API 연동 시 이 함수를 fetch 콜백으로 호출
  // function handleServerResponse(nextQuestions: FollowUpQuestion[], aiText: string | null) {
  //   setIsSubmitting(false)
  //   if (aiText) setMessages(prev => [...prev, { role: 'ai', text: aiText }])
  //   if (nextQuestions.length > 0) {
  //     setCurrentQuestions(nextQuestions)
  //   } else {
  //     setIsComplete(true)
  //   }
  // }

  return useMemo((): FollowUpChatbotViewModel => ({
    messages,
    currentQuestions,
    answer,
    isSubmitting,
    isComplete,
    onAnswerChange: (value: string) => setAnswer(value),
    onSubmit: () => {
      if (!answer.trim()) return
      setMessages(prev => [
        ...prev,
        ...currentQuestions.map(q => ({ role: 'ai' as const, text: q.question })),
        { role: 'user' as const, text: answer.trim() },
      ])
      setAnswer('')
      setIsSubmitting(true)
      setCurrentQuestions([])
      // TODO: API 연동 — 응답 수신 시 handleServerResponse 호출
      setTimeout(() => {
        setIsSubmitting(false)
        const nextStep = step + 1
        setStep(nextStep)
        if (nextStep < MOCK_QUESTIONS.length) {
          if (nextStep === 2) {
            // q2 → q3 전환 시 중간 AI 메시지 추가
            setMessages(prev => [...prev, { role: 'ai', text: '조금 더 구체적으로 알면 더 좋은 기획이 나올 것 같아요!' }])
          }
          setCurrentQuestions([MOCK_QUESTIONS[nextStep]])
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: '감사해요! 이제 기획 방향을 잡을 수 있을 것 같아요.' }])
          setIsComplete(true)
        }
      }, 1500)
    },
  }), [messages, currentQuestions, answer, isSubmitting, isComplete, step])
}
