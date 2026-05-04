import type { PlanningConversationMessage, PlanningSession } from '@/lib/types/domain'
import type { ChatMessage } from '../types/chatbotViewModel'
import {
  createAnswerChatMessage,
  createQuestionChatMessage,
  createStatusChatMessage,
} from './followUpChatbot/chatHistoryStorage'
import { getPlanningMessageTime } from './planningMessageTime'
import { getPayloadString } from './planningPredicates'

const HIDDEN_MESSAGE_TYPES = new Set([
  'planning_summary',
  'candidate_angles',
  'system_summary',
  'refresh_request',
  'planning_workspace_entered',
  'slot_answer',
])

function getQuestionTextFromMessage(message: PlanningConversationMessage): string {
  const qPayload = message.payload?.question
  if (qPayload && typeof qPayload === 'object' && !Array.isArray(qPayload)) {
    const q = qPayload as Record<string, unknown>
    if (typeof q.question === 'string' && q.question.trim()) return q.question.trim()
  }
  return message.message
}

export function mapTranscript(
  session: PlanningSession | null,
  currentQuestionId: string | null
): ChatMessage[] {
  if (!session) {
    return [createStatusChatMessage('AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.')]
  }

  const sortedMessages = [...session.messages].sort((a, b) => {
    return getPlanningMessageTime(a) - getPlanningMessageTime(b)
  })

  // questionId별로 최신 clarifying_question 인덱스·messageId와 최신 답변 인덱스를 사전 계산
  const latestQuestionIndexByQId = new Map<string, number>()
  const latestQuestionMessageIdByQId = new Map<string, string | null>()
  const latestAnswerIndexByQId = new Map<string, number>()

  sortedMessages.forEach((message, index) => {
    if (message.messageType === 'clarifying_question') {
      const questionId = getPayloadString(message.payload, 'question_id')
      if (questionId) {
        latestQuestionIndexByQId.set(questionId, index)
        latestQuestionMessageIdByQId.set(questionId, message.messageId)
      }
    }

    const questionId = getPayloadString(message.payload, 'question_id')
    if (
      questionId &&
      (message.messageType === 'slot_answer' ||
        message.messageType === 'free_text' ||
        message.messageType === 'revision_note')
    ) {
      const prev = latestAnswerIndexByQId.get(questionId) ?? -1
      if (index > prev) latestAnswerIndexByQId.set(questionId, index)
    }
  })

  // 답변이 완료된 질문 ID 세트 (lastAnswer > lastQuestion)
  const answeredQuestionIds = new Set<string>()
  latestQuestionIndexByQId.forEach((qIndex, questionId) => {
    const aIndex = latestAnswerIndexByQId.get(questionId) ?? -1
    if (aIndex > qIndex) answeredQuestionIds.add(questionId)
  })

  const seenUserAnswerKeys = new Set<string>()

  return sortedMessages
    .map((message, index): ChatMessage | null => {
      const messageType = message.messageType ?? ''
      if (HIDDEN_MESSAGE_TYPES.has(messageType)) return null

      if (messageType === 'clarifying_question' || message.role === 'assistant') {
        const questionId = getPayloadString(message.payload, 'question_id')
        const slotKey = getPayloadString(message.payload, 'slot_key')
        const eventType = getPayloadString(message.payload, 'event_type')

        if (messageType === 'clarifying_question' && eventType !== 'pt2_question') {
          return null
        }

        if (questionId) {
          const latestMessageId = latestQuestionMessageIdByQId.get(questionId)
          if (message.messageId !== latestMessageId) return null

          if (!answeredQuestionIds.has(questionId)) return null

          if (questionId === currentQuestionId) return null
        }

        return createQuestionChatMessage({
          questionId: questionId ?? message.messageId ?? `message-${index}`,
          title: '',
          question: getQuestionTextFromMessage(message),
          referenceInsight: null,
          reasonWhyAsked: null,
          slotKey: slotKey ?? '',
          responseType: '',
          allowCustom: false,
          customPlaceholder: null,
          options: [],
        }, message.createdAt?.toISOString())
      }

      if (
        (messageType === 'free_text' || messageType === 'revision_note' || message.role === 'user') &&
        getPayloadString(message.payload, 'answer_source') === 'planning_pt2'
      ) {
        const answerText = getPayloadString(message.payload, 'raw_answer') ?? message.message
        const questionId = getPayloadString(message.payload, 'question_id')
        const slotKey = getPayloadString(message.payload, 'slot_key')
        const dedupeScope = questionId ?? slotKey

        if (dedupeScope) {
          const answerKey = `${dedupeScope}:${answerText.trim()}`
          if (seenUserAnswerKeys.has(answerKey)) {
            return null
          }
          seenUserAnswerKeys.add(answerKey)
        }

        return createAnswerChatMessage({
          questionId: dedupeScope ?? message.messageId ?? `message-${index}`,
          text: answerText,
          createdAt: message.createdAt?.toISOString(),
        })
      }

      return null
    })
    .filter((message): message is ChatMessage => message !== null && message.text.trim().length > 0)
}
