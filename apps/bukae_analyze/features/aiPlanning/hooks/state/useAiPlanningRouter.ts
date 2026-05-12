'use client'

import { useEffect } from 'react'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { markWorkflowStepCompleted } from '@/lib/storage/workflowStepCompletionStorage'
import { isPt1PlanningSession, storePt1PlanningSnapshot } from '../../lib/pt1PlanningSnapshotStorage'
import { deriveAiPlanningStage } from '../../lib/aiPlanningStage'
import { useAiPlanningNavigationStateSync } from './aiPlanningRouter/useAiPlanningNavigationStateSync'
import { usePt1AnswerAutoSubmission } from './aiPlanningRouter/usePt1AnswerAutoSubmission'
import { usePt1AnswerDrafts } from './aiPlanningRouter/usePt1AnswerDrafts'
import { usePt1PlanningSession } from './aiPlanningRouter/usePt1PlanningSession'
import { useFollowUpChatbot } from './useFollowUpChatbot'

/** PT1·챗봇 중 어떤 화면을 보여줄지 결정하는 데 필요한 데이터를 수집하고 조율한다. */
export function useAiPlanningRouter({
  projectId,
  isChatbotMode,
  generationRequestId,
}: {
  projectId: string
  isChatbotMode: boolean
  generationRequestId: string | null
}) {
  const { planningSessionState, storedPt1Snapshot, questions, answeredPt1QuestionIds, isLoadingPt1Questions } =
    usePt1PlanningSession({ projectId, isChatbotMode, generationRequestId })

  const { selectedAnswers, customAnswers, fieldAnswers, selectAnswer, changeCustomAnswer, changeFieldAnswer } =
    usePt1AnswerDrafts(projectId, storedPt1Snapshot?.draft ?? null)

  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)
  const chatbotInitialSession = useAiPlanningStore((state) => state.chatbotInitialSession)

  const chatbot = useFollowUpChatbot({
    projectId,
    initialSession: isChatbotMode && chatbotInitialSession ? chatbotInitialSession : planningSessionState.session,
    enabled: isChatbotMode,
    onSessionChange: planningSessionState.replaceSession,
  })

  useEffect(() => () => resetAiPlanningStore(), [resetAiPlanningStore])

  useEffect(() => {
    if (!planningSessionState.session) return
    if (!isPt1PlanningSession(planningSessionState.session)) return

    storePt1PlanningSnapshot({
      projectId,
      session: planningSessionState.session,
      draft: { selectedAnswers, customAnswers, fieldAnswers },
    })
    markWorkflowStepCompleted(projectId, 'planning')
  }, [customAnswers, fieldAnswers, planningSessionState.session, projectId, selectedAnswers])

  const pt1AnswerSubmission = usePt1AnswerAutoSubmission({
    projectId,
    enabled: !generationRequestId,
    questions,
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    readyForApproval: Boolean(planningSessionState.session?.readyForApproval),
    onSessionChange: planningSessionState.replaceSession,
  })

  const stage = deriveAiPlanningStage({
    isChatbotMode,
    session: planningSessionState.session,
    isLoadingPt1Questions,
    pt1QuestionCount: questions.length,
    hasSavedAllPt1Answers: pt1AnswerSubmission.hasSavedAllAnswers,
    hasPendingPt1Save: pt1AnswerSubmission.hasPendingSave,
    hasPt1SaveError: pt1AnswerSubmission.hasSaveError,
    chatbotQuestionCount: chatbot.currentQuestions.length,
    isSubmittingChatbotAnswer: chatbot.isSubmitting,
    readyBrief: chatbot.readyBrief,
  })

  useAiPlanningNavigationStateSync({
    stage,
    readyBrief: chatbot.readyBrief,
    session: planningSessionState.session,
    answeredQuestionIds: answeredPt1QuestionIds,
    isSavingPt1Answers: stage === 'pt1_saving_answers',
  })

  return {
    chatbot,
    pt1: {
      errorMessage: planningSessionState.errorMessage,
      appError: planningSessionState.appError,
      saveError: pt1AnswerSubmission.saveError,
      viewProps: {
        questions,
        selectedAnswers,
        customAnswers,
        fieldAnswers,
        onSelectAnswer: selectAnswer,
        onChangeCustomAnswer: changeCustomAnswer,
        onChangeFieldAnswer: changeFieldAnswer,
      },
    },
    stage,
  }
}
