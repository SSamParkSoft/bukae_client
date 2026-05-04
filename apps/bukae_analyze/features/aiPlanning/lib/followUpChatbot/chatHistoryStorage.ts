import type { ChatMessage, ReadyBriefViewModel } from '../../types/chatbotViewModel'
import type { ActiveFollowUpQuestion } from './questions'

const FOLLOW_UP_CHAT_HISTORY_STORAGE_PREFIX = 'bukae_analyze:follow-up-chat-history:'
const CHAT_HISTORY_VERSION = 1

interface StoredFollowUpChatHistory {
  version: typeof CHAT_HISTORY_VERSION
  projectId: string
  savedAt: string
  messages: ChatMessage[]
}

function getFollowUpChatHistoryStorageKey(projectId: string): string {
  return `${FOLLOW_UP_CHAT_HISTORY_STORAGE_PREFIX}${projectId}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    (value.role === 'ai' || value.role === 'user') &&
    (
      value.kind === 'question' ||
      value.kind === 'answer' ||
      value.kind === 'status' ||
      value.kind === 'readyBrief' ||
      value.kind === 'error'
    ) &&
    typeof value.text === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.questionId === undefined || typeof value.questionId === 'string')
  )
}

function parseStoredFollowUpChatHistory(
  value: unknown,
  projectId: string
): ChatMessage[] {
  if (!isRecord(value)) return []
  if (value.version !== CHAT_HISTORY_VERSION) return []
  if (value.projectId !== projectId) return []
  if (!Array.isArray(value.messages)) return []

  return value.messages.filter(isChatMessage)
}

function hashText(value: string): string {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }

  return Math.abs(hash).toString(36)
}

export function createQuestionChatMessage(
  question: ActiveFollowUpQuestion,
  createdAt = new Date().toISOString()
): ChatMessage {
  return {
    id: `question:${question.questionId}:${hashText(question.question)}`,
    role: 'ai',
    kind: 'question',
    questionId: question.questionId,
    text: question.question,
    createdAt,
  }
}

export function createAnswerChatMessage(params: {
  questionId: string
  text: string
  createdAt?: string
}): ChatMessage {
  const createdAt = params.createdAt ?? new Date().toISOString()

  return {
    id: `answer:${params.questionId}:${createdAt}:${hashText(params.text)}`,
    role: 'user',
    kind: 'answer',
    questionId: params.questionId,
    text: params.text,
    createdAt,
  }
}

export function createStatusChatMessage(
  text: string,
  createdAt = new Date().toISOString()
): ChatMessage {
  return {
    id: `status:${createdAt}:${hashText(text)}`,
    role: 'ai',
    kind: 'status',
    text,
    createdAt,
  }
}

export function createErrorChatMessage(
  text: string,
  createdAt = new Date().toISOString()
): ChatMessage {
  return {
    id: `error:${createdAt}:${hashText(text)}`,
    role: 'ai',
    kind: 'error',
    text,
    createdAt,
  }
}

export function createReadyBriefChatMessage(
  readyBrief: ReadyBriefViewModel,
  createdAt = new Date().toISOString()
): ChatMessage {
  return {
    id: `ready-brief:${readyBrief.briefVersionId}`,
    role: 'ai',
    kind: 'readyBrief',
    text: [
      readyBrief.title,
      readyBrief.planningSummary,
      '최종 기획안 요약이 준비되었습니다. 다음 단계로 진행하면 촬영가이드와 스크립트를 생성합니다.',
    ].filter(Boolean).join('\n\n'),
    createdAt,
  }
}

export function mergeChatMessages(
  storedMessages: ChatMessage[],
  serverMessages: ChatMessage[]
): ChatMessage[] {
  if (storedMessages.length === 0) return serverMessages

  const serverMessageById = new Map(serverMessages.map((message) => [message.id, message]))
  const usedMessageIds = new Set<string>()
  const mergedMessages = storedMessages.map((message) => {
    const serverMessage = serverMessageById.get(message.id)
    usedMessageIds.add(message.id)
    return serverMessage ?? message
  })

  serverMessages.forEach((message) => {
    if (!usedMessageIds.has(message.id)) {
      mergedMessages.push(message)
    }
  })

  return mergedMessages
}

export function appendUniqueChatMessages(
  messages: ChatMessage[],
  nextMessages: ChatMessage[]
): ChatMessage[] {
  const existingIds = new Set(messages.map((message) => message.id))
  const uniqueMessages = nextMessages.filter((message) => !existingIds.has(message.id))

  if (uniqueMessages.length === 0) return messages
  return [...messages, ...uniqueMessages]
}

export function clearStoredFollowUpChatHistories(): void {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(FOLLOW_UP_CHAT_HISTORY_STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => window.localStorage.removeItem(key))
  } catch {
    return
  }
}

export function getStoredFollowUpChatHistory(projectId: string): ChatMessage[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getFollowUpChatHistoryStorageKey(projectId))
    if (!raw) return []

    return parseStoredFollowUpChatHistory(JSON.parse(raw), projectId)
  } catch {
    return []
  }
}

export function storeFollowUpChatHistory(
  projectId: string,
  messages: ChatMessage[]
): void {
  if (typeof window === 'undefined') return

  try {
    const snapshot: StoredFollowUpChatHistory = {
      version: CHAT_HISTORY_VERSION,
      projectId,
      savedAt: new Date().toISOString(),
      messages,
    }

    window.localStorage.setItem(
      getFollowUpChatHistoryStorageKey(projectId),
      JSON.stringify(snapshot)
    )
  } catch {
    return
  }
}
