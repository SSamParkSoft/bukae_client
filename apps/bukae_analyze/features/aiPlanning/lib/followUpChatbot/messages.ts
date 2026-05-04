import type { PlanningSession } from '@/lib/types/domain'
import type {
  ChatMessage,
  FollowUpQuestion,
  ReadyBriefViewModel,
} from '../../types/chatbotViewModel'
import type { FinalizedProject } from '../planningWorkflow'
import type { ActiveFollowUpQuestion } from './questions'
import {
  createErrorChatMessage,
  createReadyBriefChatMessage,
  createStatusChatMessage,
} from './chatHistoryStorage'
import { createFollowUpQuestionWorkflow } from './workflow'

export const FOLLOW_UP_STAGE_MESSAGES = {
  waitingQuestion: 'AI가 PT1 답변을 바탕으로 다음 질문을 준비 중입니다.',
  reflectingAnswer: '답변을 반영하고 있습니다.',
  finalizing: '충분한 정보가 모였습니다. 최종 기획안을 정리 중입니다.',
  approving: '촬영가이드와 스크립트 생성을 준비 중입니다.',
  readyBrief: '최종 기획안 요약이 준비되었습니다. 다음 단계로 진행하면 촬영가이드와 스크립트를 생성합니다.',
  error: '진행 중 문제가 발생했습니다.',
} as const

export const FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES = [
  '촬영가이드와 스크립트 생성을 준비 중입니다.',
  '장면별 촬영 포인트를 정리하고 있습니다.',
  '후킹 구간과 CTA 흐름을 다시 점검하고 있습니다.',
  '대본 톤과 컷 구성을 다듬고 있습니다.',
  '답변 내용을 바탕으로 핵심 메시지를 압축하고 있습니다.',
  '레퍼런스 분석 결과와 기획 방향을 맞춰 보고 있습니다.',
  '촬영 난이도와 구성 흐름을 함께 검토하고 있습니다.',
  '완성된 기획안에서 빠진 정보가 없는지 확인하고 있습니다.',
  '장면 전환과 내레이션 흐름을 조정하고 있습니다.',
  '최종 요약을 생성하기 전에 결과를 한 번 더 점검하고 있습니다.',
  '조금만 기다려 주세요. 결과를 거의 준비하고 있습니다.',
] as const

export type FollowUpStageMessage =
  typeof FOLLOW_UP_STAGE_MESSAGES[keyof typeof FOLLOW_UP_STAGE_MESSAGES]

export function mapCurrentQuestion(
  question: ActiveFollowUpQuestion | null | undefined
): FollowUpQuestion[] {
  if (!question) return []

  return [{
    questionId: question.questionId,
    question: question.question,
    responseType: question.responseType,
    allowCustom: question.allowCustom,
    customPlaceholder: question.customPlaceholder,
    options: question.options,
  }]
}

export function createReadyBriefViewModel(
  finalizedProject: FinalizedProject
): ReadyBriefViewModel {
  return {
    briefVersionId: finalizedProject.briefVersionId,
    title: finalizedProject.title,
    planningSummary: finalizedProject.planningSummary,
    status: finalizedProject.status,
  }
}

export function createChatbotMessages(params: {
  session: PlanningSession | null
  currentQuestionId: string | null
  errorMessage: string | null
  readyBrief: ReadyBriefViewModel | null
}): ChatMessage[] {
  const {
    session,
    errorMessage,
    readyBrief,
  } = params

  const transcript = session
    ? createFollowUpQuestionWorkflow(session).transcriptMessages
    : [createStatusChatMessage(FOLLOW_UP_STAGE_MESSAGES.waitingQuestion)]

  if (errorMessage) {
    return [
      ...transcript,
      createErrorChatMessage(`${FOLLOW_UP_STAGE_MESSAGES.error} ${errorMessage}`),
    ]
  }

  if (readyBrief) {
    return [
      ...transcript,
      createReadyBriefChatMessage(readyBrief),
    ]
  }

  return transcript
}

export function createVisibleMessages(params: {
  messages: ChatMessage[]
  pendingQA: ChatMessage[]
  readyBrief: ReadyBriefViewModel | null
  currentQuestions: FollowUpQuestion[]
  isSubmitting: boolean
  canFinalizeCurrentPlanning: boolean
  isReadyForApproval: boolean
  stageMessage: string
}): ChatMessage[] {
  const {
    messages,
    pendingQA,
    readyBrief,
    currentQuestions,
    isSubmitting,
    canFinalizeCurrentPlanning,
    isReadyForApproval,
    stageMessage,
  } = params
  const allMessages = pendingQA.length > 0 ? [...messages, ...pendingQA] : messages
  const shouldAppendStageMessage =
    !readyBrief &&
    pendingQA.length === 0 &&
    currentQuestions.length === 0 &&
    (isSubmitting || canFinalizeCurrentPlanning || isReadyForApproval)

  if (allMessages.length > 0 && shouldAppendStageMessage) {
    return [...allMessages, createStatusChatMessage(stageMessage)]
  }
  if (allMessages.length > 0) return allMessages
  return [createStatusChatMessage(stageMessage)]
}
