import type {
  PlanningConversationMessage,
  PlanningQuestion,
  PlanningSession,
} from '@/lib/types/domain'
import type { ChatMessage } from '../../types/chatbotViewModel'
import { getPlanningMessageTime } from '../planningMessageTime'
import { canFinalizePlanning, getPayloadString } from '../planningPredicates'
import type { ActiveFollowUpQuestion } from './questions'
import { createAnswerChatMessage, createQuestionChatMessage } from './chatHistoryStorage'

const FOLLOW_UP_ANSWER_MESSAGE_TYPES = new Set([
  'free_text',
  'revision_note',
])

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
): Map<string, PlanningConversationMessage> {
  const answers = new Map<string, PlanningConversationMessage>()
  const sortedMessages = [...session.messages].sort((a, b) => {
    return getPlanningMessageTime(a) - getPlanningMessageTime(b)
  })

  sortedMessages.forEach((message) => {
    if (!isFollowUpAnswer(message)) return

    const questionId = getPayloadString(message.payload, 'question_id')
    if (questionId) {
      answers.set(questionId, message)
    }
  })

  return answers
}

export interface FollowUpQuestionWorkflow {
  activeQuestions: ActiveFollowUpQuestion[]
  answeredQuestionCount: number
  transcriptMessages: ChatMessage[]
}

export function createFollowUpQuestionWorkflow(
  session: PlanningSession | null
): FollowUpQuestionWorkflow {
  if (!session || canFinalizePlanning(session)) {
    return {
      activeQuestions: [],
      answeredQuestionCount: 0,
      transcriptMessages: [],
    }
  }

  const answerByQuestionId = getLatestFollowUpAnswersByQuestionId(session)
  const transcriptMessages: ChatMessage[] = []
  const activeQuestions: ActiveFollowUpQuestion[] = []

  session.clarifyingQuestions.forEach((question) => {
    const answer = answerByQuestionId.get(question.questionId)

    if (answer) {
      transcriptMessages.push(
        createQuestionChatMessage(mapQuestion(question)),
        createAnswerChatMessage({
          questionId: question.questionId,
          text: getAnswerText(answer),
          createdAt: answer.createdAt?.toISOString(),
        })
      )
      return
    }

    activeQuestions.push(mapQuestion(question))
  })

  return {
    activeQuestions,
    answeredQuestionCount: answerByQuestionId.size,
    transcriptMessages,
  }
}
