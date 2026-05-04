'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { useAiPlanningNavigationStateSync } from '@/features/aiPlanning/hooks/state/useAiPlanningNavigationStateSync'
import { useFollowUpChatbot } from '@/features/aiPlanning/hooks/state/useFollowUpChatbot'
import { usePlanningSession } from '@/features/aiPlanning/hooks/state/usePlanningSession'
import { usePt1AnswerAutoSubmission } from '@/features/aiPlanning/hooks/state/usePt1AnswerAutoSubmission'
import { usePt1AnswerDrafts } from '@/features/aiPlanning/hooks/state/usePt1AnswerDrafts'
import { useAnalyzeWorkflowStore } from '@/store/useAnalyzeWorkflowStore'
import { markWorkflowStepCompleted } from '@/components/workflow/lib/workflowStepCompletionStorage'
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

function buildAiPlanningHref(
  projectId: string,
  mode: AiPlanningMode
): string {
  const params = new URLSearchParams({ projectId })

  if (mode === 'chatbot') {
    params.set('mode', 'chatbot')
  }

  return `/ai-planning?${params.toString()}`
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
  const router = useRouter()
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

  const enterChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'chatbot'))
  }

  const exitChatbotMode = () => {
    router.push(buildAiPlanningHref(projectId, 'default'))
  }

  const pt1AnswerSubmission = usePt1AnswerAutoSubmission({
    projectId,
    enabled: !generationRequestId,
    questions,
    selectedAnswers,
    customAnswers,
    fieldAnswers,
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
        <button
          type="button"
          onClick={exitChatbotMode}
          className="absolute top-4 right-4 z-10 text-[10px] text-white/25 transition-colors hover:text-white/50"
        >
          [DEV] 나가기
        </button>
      </div>
    )
  }

  if (planningSessionState.errorMessage) {
    return <PlanningSessionError message={planningSessionState.errorMessage} />
  }

  if (aiPlanningStage === 'pt1_preparing_questions') {
    return <PlanningSessionLoading />
  }

  if (aiPlanningStage === 'planning_unavailable') {
    return (
      <PlanningSessionError message="생성된 PT1 질문이 없습니다. 기획 프리세팅 제출 상태를 확인해 주세요." />
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
      <button
        type="button"
        onClick={enterChatbotMode}
        className="mt-10 mx-6 text-xs text-white/40 underline underline-offset-2"
      >
        [DEV] 정보 부족 → 챗봇 모드 테스트
      </button>
    </div>
  )
}
