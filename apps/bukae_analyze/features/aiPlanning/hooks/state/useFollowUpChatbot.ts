'use client'

import { useState, useMemo } from 'react'
import type { FollowUpQuestion, ChatMessage, FollowUpChatbotViewModel } from '../../types/chatbotViewModel'

const MOCK_INITIAL_QUESTIONS: FollowUpQuestion[] = [
  { questionId: 'q1', question: '영상에서 가장 강조하고 싶은 감정이나 분위기가 있나요?' },
  { questionId: 'q2', question: '타겟 시청자의 주된 고민이나 관심사는 무엇인가요?' },
]

const MOCK_SECOND_QUESTIONS: FollowUpQuestion[] = [
  { questionId: 'q3', question: '비슷한 영상 중 참고하고 싶은 스타일이 있다면 설명해 주세요.' },
]


export function useFollowUpChatbot(): FollowUpChatbotViewModel {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '답변 내용만으로는 기획 방향을 확정하기 어려워요. 조금 더 여쭤볼게요!' },
  ])
  const [currentQuestions, setCurrentQuestions] = useState<FollowUpQuestion[]>(MOCK_INITIAL_QUESTIONS)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [round, setRound] = useState(0)

  // TODO: API 연동 시 이 함수를 fetch 콜백으로 호출
  // function handleServerResponse(nextQuestions: FollowUpQuestion[], aiText: string, done: boolean) {
  //   setIsSubmitting(false)
  //   setMessages(prev => [...prev, { role: 'ai', text: aiText }])
  //   if (done) {
  //     setIsComplete(true)
  //   } else {
  //     setCurrentQuestions(nextQuestions)
  //   }
  // }

  return useMemo((): FollowUpChatbotViewModel => ({
    messages,
    currentQuestions,
    answers,
    isSubmitting,
    isComplete,
    onAnswerChange: (questionId: string, value: string) => {
      setAnswers(prev => ({ ...prev, [questionId]: value }))
    },
    onSubmit: () => {
      const aiMessages: ChatMessage[] = currentQuestions.map(q => ({
        role: 'ai' as const,
        text: q.question,
      }))
      const userMessages: ChatMessage[] = currentQuestions.map(q => ({
        role: 'user' as const,
        text: answers[q.questionId] ?? '',
      }))
      setMessages(prev => [...prev, ...aiMessages, ...userMessages])
      setAnswers({})
      setIsSubmitting(true)
      setCurrentQuestions([])
      // TODO: API 연동 — 응답 수신 시 handleServerResponse 호출
      setTimeout(() => {
        setIsSubmitting(false)
        if (round === 0) {
          setMessages(prev => [...prev, { role: 'ai', text: '조금 더 구체적으로 알면 더 좋은 기획이 나올 것 같아요!' }])
          setCurrentQuestions(MOCK_SECOND_QUESTIONS)
          setRound(1)
        } else {
          setMessages(prev => [...prev, { role: 'ai', text: '감사해요! 이제 기획 방향을 잡을 수 있을 것 같아요.' }])
          setIsComplete(true)
        }
      }, 1500)
    },
  }), [messages, currentQuestions, answers, isSubmitting, isComplete, round])
}
