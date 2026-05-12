'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAiPlanningNavigationStateSync } from '@/features/aiPlanning/hooks/state/useAiPlanningNavigationStateSync'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { usePt1AnswerAutoSubmission } from '@/features/aiPlanning/hooks/state/usePt1AnswerAutoSubmission'
import { usePt1AnswerDrafts } from '@/features/aiPlanning/hooks/state/usePt1AnswerDrafts'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { markWorkflowStepCompleted } from '@/lib/storage/workflowStepCompletionStorage'
import { useDebouncedValue } from '@/app/_hooks/useDebouncedValue'
import { createAppError } from '@/lib/errors/appError'
import {
  getStoredPt1PlanningSnapshot,
  isPt1PlanningSession,
  storePt1PlanningSnapshot,
  type Pt1PlanningSnapshot,
} from '@/features/aiPlanning/lib/pt1PlanningSnapshotStorage'
import {
  deriveAiPlanningStage,
  getAnsweredPt1QuestionIds,
} from '@/features/aiPlanning/lib/aiPlanningStage'
import { FollowUpChatbot } from './chatbotComponents'
import { PlanningQuestionCard } from './PlanningQuestionCard'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'

type AiPlanningMode = 'default' | 'chatbot'
const PT1_TEXT_ANSWER_DEBOUNCE_MS = 600

interface LocalPt1PlanningSnapshotState {
  projectId: string
  snapshot: Pt1PlanningSnapshot | null
  isLoaded: boolean
}

function createLocalPt1PlanningSnapshotState(
  projectId: string,
  snapshot: Pt1PlanningSnapshot | null = null,
  isLoaded = false
): LocalPt1PlanningSnapshotState {
  return {
    projectId,
    snapshot,
    isLoaded,
  }
}

function isCurrentLocalPt1PlanningSnapshotState(
  state: LocalPt1PlanningSnapshotState,
  projectId: string
): boolean {
  return state.projectId === projectId
}

export function AiPlanningPageClient({
  projectId,
  mode,
  generationRequestId,
}: {
  projectId: string
  mode: AiPlanningMode
  generationRequestId: string | null
}) {
  const isChatbotMode = mode === 'chatbot'
  const pt1CacheKey = projectId
  const [localPt1SnapshotState, setLocalPt1SnapshotState] = useState<LocalPt1PlanningSnapshotState>(() => (
    createLocalPt1PlanningSnapshotState(projectId)
  ))
  const currentStoredPt1SnapshotState = isCurrentLocalPt1PlanningSnapshotState(
    localPt1SnapshotState,
    projectId
  )
    ? localPt1SnapshotState
    : createLocalPt1PlanningSnapshotState(projectId)
  const storedPt1Snapshot = currentStoredPt1SnapshotState.snapshot
  const cachedPlanningSession = useAnalyzeWorkflowStore((state) => state.getCachedPlanningSession(projectId))
  const cachePlanningSession = useAnalyzeWorkflowStore((state) => state.cachePlanningSession)
  const cachedPt1PlanningSession = isPt1PlanningSession(cachedPlanningSession)
    ? cachedPlanningSession
    : null
  const shouldUseStoredPt1Snapshot = !isChatbotMode && Boolean(storedPt1Snapshot)
  const planningInitialSession = shouldUseStoredPt1Snapshot
    ? storedPt1Snapshot?.session ?? null
    : cachedPt1PlanningSession ?? null
  const shouldFetchPlanningSession =
    !isChatbotMode &&
    !generationRequestId &&
    currentStoredPt1SnapshotState.isLoaded &&
    !shouldUseStoredPt1Snapshot

  const planningSessionState = usePlanningSession(projectId, planningInitialSession, shouldFetchPlanningSession)
  const {
    selectedAnswers,
    customAnswers,
    fieldAnswers,
    selectAnswer,
    changeCustomAnswer,
    changeFieldAnswer,
  } = usePt1AnswerDrafts(pt1CacheKey, storedPt1Snapshot?.draft ?? null)
  const resetAiPlanningStore = useAiPlanningStore((state) => state.reset)
  const chatbotInitialSession = useAiPlanningStore((state) => state.chatbotInitialSession)
  const replacePlanningSession = planningSessionState.replaceSession
  const chatbotViewModel = useFollowUpChatbot({
    projectId,
    initialSession: isChatbotMode && chatbotInitialSession ? chatbotInitialSession : planningSessionState.session,
    enabled: isChatbotMode,
    onSessionChange: replacePlanningSession,
  })
  const displayedPlanningSession = isChatbotMode || isPt1PlanningSession(planningSessionState.session)
    ? planningSessionState.session
    : storedPt1Snapshot?.session ?? null

  const questions = useMemo(
    () => displayedPlanningSession?.clarifyingQuestions ?? [],
    [displayedPlanningSession]
  )
  const answeredPt1QuestionIds = useMemo(
    () => getAnsweredPt1QuestionIds(displayedPlanningSession),
    [displayedPlanningSession]
  )
  const debouncedCustomAnswers = useDebouncedValue(
    customAnswers,
    PT1_TEXT_ANSWER_DEBOUNCE_MS
  )
  const debouncedFieldAnswers = useDebouncedValue(
    fieldAnswers,
    PT1_TEXT_ANSWER_DEBOUNCE_MS
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalPt1SnapshotState(createLocalPt1PlanningSnapshotState(
        projectId,
        getStoredPt1PlanningSnapshot(projectId),
        true
      ))
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [projectId])

  useEffect(() => {
    return () => {
      resetAiPlanningStore()
    }
  }, [resetAiPlanningStore])

  useEffect(() => {
    if (!planningSessionState.session) return
    if (!isPt1PlanningSession(planningSessionState.session)) return

    cachePlanningSession(projectId, planningSessionState.session)
  }, [cachePlanningSession, planningSessionState.session, projectId])

  useEffect(() => {
    if (!planningSessionState.session) return
    if (!isPt1PlanningSession(planningSessionState.session)) return

    storePt1PlanningSnapshot({
      projectId,
      session: planningSessionState.session,
      draft: {
        selectedAnswers,
        customAnswers,
        fieldAnswers,
      },
    })
    markWorkflowStepCompleted(projectId, 'planning')
  }, [
    customAnswers,
    fieldAnswers,
    planningSessionState.session,
    projectId,
    selectedAnswers,
  ])

  const pt1AnswerSubmission = usePt1AnswerAutoSubmission({
    projectId,
    enabled: !generationRequestId,
    questions,
    selectedAnswers,
    customAnswers: debouncedCustomAnswers,
    fieldAnswers: debouncedFieldAnswers,
    readyForApproval: Boolean(planningSessionState.session?.readyForApproval),
    onSessionChange: replacePlanningSession,
  })
  const isLoadingPt1Questions =
    questions.length === 0 &&
    (
      planningSessionState.isLoading ||
      (
        !isChatbotMode &&
        !isPt1PlanningSession(planningSessionState.session) &&
        !currentStoredPt1SnapshotState.isLoaded
      ) ||
      (Boolean(generationRequestId) && !currentStoredPt1SnapshotState.isLoaded)
    )
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

  if (isChatbotMode) {
    return (
      <div className="relative h-full flex flex-col">
        <FollowUpChatbot data={chatbotViewModel} />
      </div>
    )
  }

  if (planningSessionState.errorMessage) {
    return (
      <PlanningSessionError
        message={planningSessionState.errorMessage}
        appError={planningSessionState.appError}
      />
    )
  }

  if (pt1AnswerSubmission.saveError) {
    return (
      <PlanningSessionError
        message={pt1AnswerSubmission.saveError.message}
        appError={pt1AnswerSubmission.saveError}
      />
    )
  }

  if (aiPlanningStage === 'pt1_preparing_questions') {
    return <PlanningSessionLoading />
  }

  if (aiPlanningStage === 'planning_unavailable') {
    return (
      <PlanningSessionError
        message='생성된 PT1 질문이 없습니다. 기획 프리세팅 제출 상태를 확인해 주세요.'
        appError={createAppError('invalid_project_state', 'planning_session_fetch')}
      />
    )
  }

  return (
    <div className="pb-32">
      <div className="grid grid-cols-2 gap-y-10">
        {questions.map((question, index) => (
          <div key={question.questionId} className="px-6 min-w-0">
            <PlanningQuestionCard
              question={question}
              index={index}
              selectedValue={selectedAnswers[question.questionId] ?? null}
              customValue={customAnswers[question.questionId] ?? ''}
              fieldValues={fieldAnswers[question.questionId] ?? {}}
              onSelect={(value) => selectAnswer(question.questionId, value)}
              onCustomChange={(value) => changeCustomAnswer(question.questionId, value)}
              onFieldChange={(fieldKey, value) => changeFieldAnswer(question.questionId, fieldKey, value)}
              onCustomBlur={() => undefined}
              onFieldBlur={() => undefined}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
