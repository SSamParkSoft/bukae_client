'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  appendUniqueChatMessages,
  createErrorChatMessage,
  createQuestionChatMessage,
  createReadyBriefChatMessage,
  createStatusChatMessage,
  mergeChatMessages,
} from '../../../lib/followUpChatbot/chatHistoryStorage'
import {
  FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES,
  FOLLOW_UP_STAGE_MESSAGES,
  type FollowUpStageMessage,
} from '../../../lib/followUpChatbot/messages'
import type { ActiveFollowUpQuestion } from '../../../lib/followUpChatbot/questions'
import type {
  ChatMessage,
  ReadyBriefViewModel,
} from '../../../types/chatbotViewModel'

const FINALIZE_PROGRESS_MESSAGE_INTERVAL_MS = 20_000
const EMPTY_CHAT_MESSAGES: ChatMessage[] = []

interface ChatHistoryState {
  projectId: string
  messages: ChatMessage[]
}

interface UseFollowUpChatHistoryParams {
  projectId: string
  enabled: boolean
  serverTranscriptMessages: ChatMessage[]  // 세션 transcript — 현재 탭의 임시 히스토리와 merge해 중복 방지
  currentQuestion: ActiveFollowUpQuestion | null
  isSubmitting: boolean
  readyBrief: ReadyBriefViewModel | null
  errorMessage: string | null
  stageMessage: FollowUpStageMessage
}

function scheduleChatHistoryTask(task: () => void): () => void {
  const timeoutId = window.setTimeout(task, 0)

  return () => {
    window.clearTimeout(timeoutId)
  }
}

/** 현재 탭에서만 유지되는 채팅 히스토리와 메시지 추가·삭제 함수를 제공한다. */
export function useFollowUpChatHistory({
  projectId,
  enabled,
  serverTranscriptMessages,
  currentQuestion,
  isSubmitting,
  readyBrief,
  errorMessage,
  stageMessage,
}: UseFollowUpChatHistoryParams) {
  const [chatHistoryState, setChatHistoryState] = useState<ChatHistoryState>(() => ({
    projectId,
    messages: [],
  }))
  const currentChatHistory = chatHistoryState.projectId === projectId
    ? chatHistoryState.messages
    : EMPTY_CHAT_MESSAGES

  const updateChatHistory = useCallback((
    updater: (messages: ChatMessage[]) => ChatMessage[]
  ) => {
    setChatHistoryState((prev) => {
      const currentMessages = prev.projectId === projectId
        ? prev.messages
        : EMPTY_CHAT_MESSAGES

      return {
        projectId,
        messages: updater(currentMessages),
      }
    })
  }, [projectId])

  const shouldAppendProgressMessages =
    enabled &&
    isSubmitting &&
    !currentQuestion &&
    !readyBrief &&
    !errorMessage &&
    (
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.waitingQuestion ||
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.finalizing ||
      stageMessage === FOLLOW_UP_STAGE_MESSAGES.approving
    )

  const appendChatMessages = useCallback((messages: ChatMessage[]) => {
    updateChatHistory((prev) => appendUniqueChatMessages(prev, messages))
  }, [updateChatHistory])

  const appendStatusMessage = useCallback((text: string) => {
    updateChatHistory((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.kind === 'status' && lastMessage.text === text) {
        return prev
      }

      return [...prev, createStatusChatMessage(text)]
    })
  }, [updateChatHistory])

  const appendErrorMessage = useCallback((text: string) => {
    updateChatHistory((prev) => [...prev, createErrorChatMessage(text)])
  }, [updateChatHistory])

  const appendReadyBriefMessage = useCallback((nextReadyBrief: ReadyBriefViewModel) => {
    appendChatMessages([createReadyBriefChatMessage(nextReadyBrief)])
  }, [appendChatMessages])

  const removeReadyBriefMessages = useCallback(() => {
    updateChatHistory((prev) => prev.filter((message) => message.kind !== 'readyBrief'))
  }, [updateChatHistory])

  useEffect(() => {
    if (!enabled) return

    return scheduleChatHistoryTask(() => {
      updateChatHistory((prev) => (
        mergeChatMessages(prev, serverTranscriptMessages)
      ))
    })
  }, [enabled, serverTranscriptMessages, updateChatHistory])

  useEffect(() => {
    if (!enabled || !isSubmitting || readyBrief || errorMessage) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.approving) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.reflectingAnswer) return

    return scheduleChatHistoryTask(() => {
      appendStatusMessage(stageMessage)
    })
  }, [
    appendStatusMessage,
    enabled,
    errorMessage,
    isSubmitting,
    readyBrief,
    stageMessage,
  ])

  useEffect(() => {
    if (!enabled || !errorMessage) return

    return scheduleChatHistoryTask(() => {
      appendErrorMessage(`${FOLLOW_UP_STAGE_MESSAGES.error} ${errorMessage}`)
    })
  }, [appendErrorMessage, enabled, errorMessage])

  useEffect(() => {
    if (!shouldAppendProgressMessages) return

    let nextIndex = 0
    const firstMessage =
      FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES[nextIndex] ??
      FOLLOW_UP_STAGE_MESSAGES.approving

    const firstMessageTimeoutId = window.setTimeout(() => {
      appendStatusMessage(firstMessage)
      nextIndex = (nextIndex + 1) % FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES.length
    }, 0)

    const intervalId = window.setInterval(() => {
      const nextMessage =
        FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES[nextIndex] ??
        FOLLOW_UP_STAGE_MESSAGES.approving

      appendStatusMessage(nextMessage)
      nextIndex = (nextIndex + 1) % FOLLOW_UP_FINALIZE_PROGRESS_MESSAGES.length
    }, FINALIZE_PROGRESS_MESSAGE_INTERVAL_MS)

    return () => {
      window.clearTimeout(firstMessageTimeoutId)
      window.clearInterval(intervalId)
    }
  }, [appendStatusMessage, shouldAppendProgressMessages])

  const visibleChatHistory = useMemo(() => {
    if (!enabled || !currentQuestion) return currentChatHistory

    return appendUniqueChatMessages(
      currentChatHistory,
      [createQuestionChatMessage(currentQuestion)]
    )
  }, [currentChatHistory, currentQuestion, enabled])

  return {
    chatHistory: visibleChatHistory,
    appendChatMessages,
    appendReadyBriefMessage,
    removeReadyBriefMessages,
  }
}
