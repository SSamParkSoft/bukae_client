'use client'

import { useState, useMemo } from 'react'
import type { FollowUpQuestion, ChatMessage, Exchange, FollowUpChatbotViewModel } from '../types/chatbotViewModel'

const MOCK_INITIAL_QUESTIONS: FollowUpQuestion[] = [
  { questionId: 'q1', question: '영상에서 가장 강조하고 싶은 감정이나 분위기가 있나요?' },
  { questionId: 'q2', question: '타겟 시청자의 주된 고민이나 관심사는 무엇인가요?' },
]

const MOCK_SECOND_QUESTIONS: FollowUpQuestion[] = [
  { questionId: 'q3', question: '비슷한 영상 중 참고하고 싶은 스타일이 있다면 설명해 주세요.' },
]

function toExchanges(messages: ChatMessage[]): Exchange[] {
  const result: Exchange[] = []
  let i = 0
  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'ai') {
      const next = messages[i + 1]
      result.push({
        aiTexts: [msg.text],
        userAnswers: next?.role === 'user' ? [next.text] : [],
      })
      i += next?.role === 'user' ? 2 : 1
    } else {
      i += 1
    }
  }
  return result
}

export function useFollowUpChatbotViewModel(): FollowUpChatbotViewModel {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: '답변 내용만으로는 기획 방향을 확정하기 어려워요. 조금 더 여쭤볼게요!' },
  ])
  const [currentQuestions, setCurrentQuestions] = useState<FollowUpQuestion[]>(MOCK_INITIAL_QUESTIONS)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [round, setRound] = useState(0)

  return useMemo((): FollowUpChatbotViewModel => ({
    exchanges: toExchanges(messages),
    currentQuestions,
    answers,
    isSubmitting,
    isComplete,
    onAnswerChange: (questionId: string, value: string) => {
      setAnswers(prev => ({ ...prev, [questionId]: value }))
    },
    onSubmit: () => {
      const userMessages: ChatMessage[] = currentQuestions.map(q => ({
        role: 'user' as const,
        text: answers[q.questionId] ?? '',
      }))
      setMessages(prev => [...prev, ...userMessages])
      setAnswers({})
      setIsSubmitting(true)
      setCurrentQuestions([])
      // TODO: API 연동 — 응답 수신 시 onServerResponse 호출
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
    onServerResponse: (nextQuestions: FollowUpQuestion[], aiText: string, done: boolean) => {
      setIsSubmitting(false)
      setMessages(prev => [...prev, { role: 'ai', text: aiText }])
      if (done) {
        setIsComplete(true)
      } else {
        setCurrentQuestions(nextQuestions)
      }
    },
  }), [messages, currentQuestions, answers, isSubmitting, isComplete, round])
}
