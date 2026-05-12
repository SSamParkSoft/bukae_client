'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  appendUniqueChatMessages,
  createErrorChatMessage,
  createQuestionChatMessage,
  createReadyBriefChatMessage,
  createStatusChatMessage,
  getStoredFollowUpChatHistory,
  mergeChatMessages,
  storeFollowUpChatHistory,
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

interface UseFollowUpChatHistoryParams {
  projectId: string
  enabled: boolean
  serverTranscriptMessages: ChatMessage[]
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
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [chatHistoryProjectId, setChatHistoryProjectId] = useState<string | null>(null)
  const isCurrentChatHistoryLoaded = chatHistoryProjectId === projectId

  const shouldAppendProgressMessages =
    enabled &&
    isCurrentChatHistoryLoaded &&
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
    setChatHistory((prev) => appendUniqueChatMessages(prev, messages))
  }, [])

  const appendStatusMessage = useCallback((text: string) => {
    setChatHistory((prev) => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.kind === 'status' && lastMessage.text === text) {
        return prev
      }

      return [...prev, createStatusChatMessage(text)]
    })
  }, [])

  const appendErrorMessage = useCallback((text: string) => {
    setChatHistory((prev) => [...prev, createErrorChatMessage(text)])
  }, [])

  const appendReadyBriefMessage = useCallback((nextReadyBrief: ReadyBriefViewModel) => {
    appendChatMessages([createReadyBriefChatMessage(nextReadyBrief)])
  }, [appendChatMessages])

  const removeReadyBriefMessages = useCallback(() => {
    setChatHistory((prev) => prev.filter((message) => message.kind !== 'readyBrief'))
  }, [])

  useEffect(() => {
    return scheduleChatHistoryTask(() => {
      const nextChatHistory = getStoredFollowUpChatHistory(projectId)
      setChatHistory(nextChatHistory)
      setChatHistoryProjectId(projectId)
    })
  }, [projectId])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded) return

    return scheduleChatHistoryTask(() => {
      setChatHistory((prev) => (
        mergeChatMessages(prev, serverTranscriptMessages)
      ))
    })
  }, [enabled, isCurrentChatHistoryLoaded, serverTranscriptMessages])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded) return

    storeFollowUpChatHistory(projectId, chatHistory)
  }, [chatHistory, enabled, isCurrentChatHistoryLoaded, projectId])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !currentQuestion) return

    return scheduleChatHistoryTask(() => {
      appendChatMessages([createQuestionChatMessage(currentQuestion)])
    })
  }, [appendChatMessages, currentQuestion, enabled, isCurrentChatHistoryLoaded])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !isSubmitting || readyBrief || errorMessage) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.approving) return
    if (stageMessage === FOLLOW_UP_STAGE_MESSAGES.reflectingAnswer) return

    return scheduleChatHistoryTask(() => {
      appendStatusMessage(stageMessage)
    })
  }, [
    appendStatusMessage,
    enabled,
    errorMessage,
    isCurrentChatHistoryLoaded,
    isSubmitting,
    readyBrief,
    stageMessage,
  ])

  useEffect(() => {
    if (!enabled || !isCurrentChatHistoryLoaded || !errorMessage) return

    return scheduleChatHistoryTask(() => {
      appendErrorMessage(`${FOLLOW_UP_STAGE_MESSAGES.error} ${errorMessage}`)
    })
  }, [appendErrorMessage, enabled, errorMessage, isCurrentChatHistoryLoaded])

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

  return {
    chatHistory,
    isCurrentChatHistoryLoaded,
    appendChatMessages,
    appendReadyBriefMessage,
    removeReadyBriefMessages,
  }
}
