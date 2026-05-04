import type {
  PlanningConversationMessage,
  PlanningQuestion,
  PlanningSession,
} from '@/lib/types/domain'
import type { ChatMessage } from '../../types/chatbotViewModel'
import { getPlanningMessageTime } from '../planningMessageTime'
import { getPayloadString } from '../planningPredicates'
import type { ActiveFollowUpQuestion } from './questions'
import { createAnswerChatMessage, createQuestionChatMessage } from './chatHistoryStorage'

const FOLLOW_UP_ANSWER_MESSAGE_TYPES = new Set([
  'free_text',
  'revision_note',
])

interface IndexedPlanningMessage {
  message: PlanningConversationMessage
  index: number
}

function mapQuestion(question: PlanningQuestion): ActiveFollowUpQuestion {
  return {
    questionId: question.questionId,
    title: question.title,
    question: question.question,
    referenceInsight: question.referenceInsight,
    reasonWhyAsked: question.reasonWhyAsked,
    slotKey: question.slotKey,
    responseType: question.responseType,
    allowCustom: question.allowCustom,
    customPlaceholder: question.customPlaceholder,
    options: question.options,
  }
}

function getAnswerText(message: PlanningConversationMessage): string {
  return getPayloadString(message.payload, 'raw_answer') ?? message.message
}

function isFollowUpAnswer(message: PlanningConversationMessage): boolean {
  const messageType = message.messageType ?? ''
  return (
    FOLLOW_UP_ANSWER_MESSAGE_TYPES.has(messageType) &&
    getPayloadString(message.payload, 'answer_source') === 'planning_pt2'
  )
}

function getLatestFollowUpAnswersByQuestionId(
  session: PlanningSession
): Map<string, IndexedPlanningMessage> {
  const answers = new Map<string, IndexedPlanningMessage>()
  const sortedMessages = [...session.messages].sort((a, b) => {
    return getPlanningMessageTime(a) - getPlanningMessageTime(b)
  })

  sortedMessages.forEach((message, index) => {
    if (!isFollowUpAnswer(message)) return

    const questionId = getPayloadString(message.payload, 'question_id')
    if (questionId) {
      answers.set(questionId, { message, index })
    }
  })

  return answers
}

function getLatestQuestionIndexByQuestionId(session: PlanningSession): Map<string, number> {
  const questionIndexes = new Map<string, number>()
  const sortedMessages = [...session.messages].sort((a, b) => {
    return getPlanningMessageTime(a) - getPlanningMessageTime(b)
  })

  sortedMessages.forEach((message, index) => {
    if (message.messageType !== 'clarifying_question') return

    const questionId = getPayloadString(message.payload, 'question_id')
    if (questionId) {
      questionIndexes.set(questionId, index)
    }
  })

  return questionIndexes
}

function isAnswerForCurrentQuestion(
  answer: IndexedPlanningMessage,
  question: PlanningQuestion,
  latestQuestionIndex: number | null
): boolean {
  if (latestQuestionIndex !== null && answer.index < latestQuestionIndex) {
    return false
  }

  const answeredQuestionText = getPayloadString(answer.message.payload, 'question_text')?.trim()
  if (answeredQuestionText && answeredQuestionText !== question.question.trim()) {
    return false
  }

  return true
}

export interface FollowUpQuestionWorkflow {
  activeQuestions: ActiveFollowUpQuestion[]
  answeredQuestionCount: number
  transcriptMessages: ChatMessage[]
}

export function createFollowUpQuestionWorkflow(
  session: PlanningSession | null
): FollowUpQuestionWorkflow {
  if (!session) {
    return {
      activeQuestions: [],
      answeredQuestionCount: 0,
      transcriptMessages: [],
    }
  }

  const answerByQuestionId = getLatestFollowUpAnswersByQuestionId(session)
  const latestQuestionIndexByQuestionId = getLatestQuestionIndexByQuestionId(session)
  const transcriptMessages: ChatMessage[] = []
  const activeQuestions: ActiveFollowUpQuestion[] = []
  let answeredQuestionCount = 0

  session.clarifyingQuestions.forEach((question) => {
    const answer = answerByQuestionId.get(question.questionId)
    const latestQuestionIndex = latestQuestionIndexByQuestionId.get(question.questionId) ?? null

    if (answer && isAnswerForCurrentQuestion(answer, question, latestQuestionIndex)) {
      answeredQuestionCount += 1
      transcriptMessages.push(
        createQuestionChatMessage(mapQuestion(question)),
        createAnswerChatMessage({
          questionId: question.questionId,
          text: getAnswerText(answer.message),
          createdAt: answer.message.createdAt?.toISOString(),
        })
      )
      return
    }

    activeQuestions.push(mapQuestion(question))
  })

  return {
    activeQuestions,
    answeredQuestionCount,
    transcriptMessages,
  }
}
