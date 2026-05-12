'use client'

import { useEffect } from 'react'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAiPlanningNavigationStateSync } from '@/features/aiPlanning/hooks/state/useAiPlanningNavigationStateSync'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePt1AnswerAutoSubmission } from '@/features/aiPlanning/hooks/state/usePt1AnswerAutoSubmission'
import { usePt1AnswerDrafts } from '@/features/aiPlanning/hooks/state/usePt1AnswerDrafts'
import { usePt1PlanningSession } from '@/features/aiPlanning/hooks/state/usePt1PlanningSession'
import { markWorkflowStepCompleted } from '@/lib/storage/workflowStepCompletionStorage'
import { createAppError } from '@/lib/errors/appError'
import { isPt1PlanningSession, storePt1PlanningSnapshot } from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'
import { deriveAiPlanningStage } from '@/features/aiPlanning/lib/aiPlanningStage'
import { FollowUpPlanningView } from './FollowUpPlanningView'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import { Pt1PlanningView } from './Pt1PlanningView'

type AiPlanningMode = 'default' | 'chatbot'

export function AiPlanningFlow({
  projectId,
  mode,
  generationRequestId,
}: {
  projectId: string
  mode: AiPlanningMode
  generationRequestId: string | null
}) {
  const isChatbotMode = mode === 'chatbot'

  const { planningSessionState, storedPt1Snapshot, questions, answeredPt1QuestionIds, isLoadingPt1Questions } =
    usePt1PlanningSession({ projectId, isChatbotMode, generationRequestId })

  const { selectedAnswers, customAnswers, fieldAnswers, selectAnswer, changeCustomAnswer, changeFieldAnswer } =
    usePt1AnswerDrafts(projectId, storedPt1Snapshot?.draft ?? null)

  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)
  const chatbotInitialSession = useAiPlanningStore((state) => state.chatbotInitialSession)

  const chatbotViewModel = useFollowUpChatbot({
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

  const aiPlanningStage = deriveAiPlanningStage({
    isChatbotMode,
    session: planningSessionState.session,
    isLoadingPt1Questions,
    pt1QuestionCount: questions.length,
    hasSavedAllPt1Answers: pt1AnswerSubmission.hasSavedAllAnswers,
    hasPendingPt1Save: pt1AnswerSubmission.hasPendingSave,
    hasPt1SaveError: pt1AnswerSubmission.hasSaveError,
    chatbotQuestionCount: chatbotViewModel.currentQuestions.length,
    isSubmittingChatbotAnswer: chatbotViewModel.isSubmitting,
    readyBrief: chatbotViewModel.readyBrief,
  })

  useAiPlanningNavigationStateSync({
    stage: aiPlanningStage,
    readyBrief: chatbotViewModel.readyBrief,
    session: planningSessionState.session,
    answeredQuestionIds: answeredPt1QuestionIds,
    isSavingPt1Answers: aiPlanningStage === 'pt1_saving_answers',
  })

  if (isChatbotMode) return <FollowUpPlanningView data={chatbotViewModel} />
  if (planningSessionState.errorMessage) return <PlanningSessionError message={planningSessionState.errorMessage} appError={planningSessionState.appError} />
  if (pt1AnswerSubmission.saveError) return <PlanningSessionError message={pt1AnswerSubmission.saveError.message} appError={pt1AnswerSubmission.saveError} />
  if (aiPlanningStage === 'pt1_preparing_questions') return <PlanningSessionLoading />
  if (aiPlanningStage === 'planning_unavailable') return <PlanningSessionError message='생성된 PT1 질문이 없습니다. 기획 프리세팅 제출 상태를 확인해 주세요.' appError={createAppError('invalid_project_state', 'planning_session_fetch')} />

  return (
    <Pt1PlanningView
      questions={questions}
      selectedAnswers={selectedAnswers}
      customAnswers={customAnswers}
      fieldAnswers={fieldAnswers}
      onSelectAnswer={selectAnswer}
      onChangeCustomAnswer={changeCustomAnswer}
      onChangeFieldAnswer={changeFieldAnswer}
    />
  )
}
