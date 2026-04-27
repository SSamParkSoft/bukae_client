'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { mapPlanningSetupAnswersToIntakeRequest, validatePlanningSetupAnswers } from '@/features/planningSetup/lib/intakeRequest'
import { approveBrief, listBriefs } from '@/lib/services/briefs'
import { startGeneration } from '@/lib/services/generations'
import { getPlanningSession, postPlanningMessage, submitIntake } from '@/lib/services/planning'
import { serializePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'
import { usePlanningStore } from '@/store/usePlanningStore'
import { LAYOUT } from './layout-constants'
import { STEPS, buildStepPath, getCurrentStepIndex } from '../_utils/stepNavigation'
import { StepNavButton } from '../buttons/StepNavButton'
import type { Brief, PlanningQuestion, PlanningSession } from '@/lib/types/domain'

const PT2_ROUTE_POLLING_INTERVAL_MS = 2000
const PT2_ROUTE_POLLING_LIMIT = 10
const BRIEF_ROUTE_POLLING_INTERVAL_MS = 2000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function getPayloadString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key]
  return typeof value === 'string' ? value : null
}

function getNestedRecord(
  record: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const value = record?.[key]
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function isTruthyRecordValue(
  record: Record<string, unknown> | null,
  key: string
): boolean {
  return record?.[key] === true
}

function isPt2PlanningQuestion(question: PlanningQuestion): boolean {
  const eventType = question.eventType ?? getPayloadString(question.payload, 'event_type')
  const answerSource = question.answerSource ?? getPayloadString(question.payload, 'answer_source')

  return eventType === 'pt2_question' || answerSource === 'planning_pt2'
}

function hasPt2PlanningQuestions(session: PlanningSession | null): boolean {
  return (session?.clarifyingQuestions ?? []).some(isPt2PlanningQuestion)
}

function canFinalizePlanning(session: PlanningSession | null): boolean {
  if (!session || hasPt2PlanningQuestions(session)) return false

  const surface = session.planningSurface
  const artifacts = session.planningArtifacts
  const surfaceDetailGapState = surface?.detailGapState ?? null
  const artifactDetailGapState = getNestedRecord(artifacts, 'detail_gap_state')

  return (
    surface?.readyToFinalize === true ||
    isTruthyRecordValue(artifacts, 'ready_to_finalize') ||
    isTruthyRecordValue(surfaceDetailGapState, 'is_sufficient') ||
    isTruthyRecordValue(artifactDetailGapState, 'is_sufficient')
  )
}

function findGenerationBrief(briefs: Brief[], briefVersionId: string): Brief | null {
  return briefs.find((brief) => brief.briefVersionId === briefVersionId) ?? null
}

function pickLatestGenerationBrief(briefs: Brief[]): Brief | null {
  const candidates = briefs
    .filter((brief) => brief.status === 'REVIEW_READY' || brief.status === 'APPROVED')
    .sort((a, b) => {
      const aTime = a.createdAt?.getTime() ?? 0
      const bTime = b.createdAt?.getTime() ?? 0
      return bTime - aTime
    })

  return candidates[0] ?? null
}

async function waitPt2RoutingSession(
  projectId: string,
  initialSession: PlanningSession | null
): Promise<PlanningSession | null> {
  let session = initialSession

  for (let i = 0; i < PT2_ROUTE_POLLING_LIMIT; i += 1) {
    if (session && (hasPt2PlanningQuestions(session) || canFinalizePlanning(session) || session.readyForApproval)) {
      return session
    }

    await sleep(PT2_ROUTE_POLLING_INTERVAL_MS)
    session = await getPlanningSession(projectId)
  }

  return session
}

async function waitReviewReadyBrief(projectId: string): Promise<Brief> {
  let selectedBrief: Brief | null = null

  while (!selectedBrief) {
    const briefs = await listBriefs(projectId)
    selectedBrief = pickLatestGenerationBrief(briefs)

    if (!selectedBrief) {
      await sleep(BRIEF_ROUTE_POLLING_INTERVAL_MS)
    }
  }

  return selectedBrief
}

async function resolveApprovedBriefVersionId(
  projectId: string,
  briefVersionId: string,
  knownStatus: string | null
): Promise<string> {
  if (knownStatus === 'APPROVED') {
    return briefVersionId
  }

  const currentBrief = findGenerationBrief(await listBriefs(projectId), briefVersionId)
  if (currentBrief?.status === 'APPROVED') {
    return currentBrief.briefVersionId
  }

  try {
    const approvedBrief = await approveBrief(projectId, briefVersionId)
    return approvedBrief.briefVersionId
  } catch (error) {
    const refreshedBrief = findGenerationBrief(await listBriefs(projectId), briefVersionId)
    if (refreshedBrief?.status === 'APPROVED') {
      return refreshedBrief.briefVersionId
    }

    throw error
  }
}

export function RightSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const planningFromQuery = searchParams.get('planning')
  const mode = searchParams.get('mode')
  const planningAnswers = usePlanningStore((state) => state.answers)
  const isSubmitting = usePlanningStore((state) => state.isSubmitting)
  const lastSubmittedIntakeKey = usePlanningStore((state) => state.lastSubmittedIntakeKey)
  const setSubmitting = usePlanningStore((state) => state.setSubmitting)
  const setSubmitError = usePlanningStore((state) => state.setSubmitError)
  const markIntakeSubmitted = usePlanningStore((state) => state.markIntakeSubmitted)
  const canProceedAiPlanning = useAiPlanningStore((state) => state.canProceed)
  const isAdvancingAiPlanning = useAiPlanningStore((state) => state.isAdvancing)
  const aiPlanningNextTarget = useAiPlanningStore((state) => state.nextTarget)
  const planningSessionId = useAiPlanningStore((state) => state.planningSessionId)
  const briefVersionId = useAiPlanningStore((state) => state.briefVersionId)
  const briefStatus = useAiPlanningStore((state) => state.briefStatus)
  const answeredQuestionIds = useAiPlanningStore((state) => state.answeredQuestionIds)
  const setAdvancingAiPlanning = useAiPlanningStore((state) => state.setAdvancing)
  const isPlanningSetup = pathname.startsWith('/planning-setup')
  const isAiPlanning = pathname.startsWith('/ai-planning')
  const isChatbotMode = mode === 'chatbot'
  const planning =
    isPlanningSetup
      ? serializePlanningSetupAnswers(planningAnswers)
      : planningFromQuery

  if (pathname === '/') return null

  const currentIndex = getCurrentStepIndex(pathname)
  const isLast = currentIndex === STEPS.length - 1
  const planningValidationError = isPlanningSetup
    ? validatePlanningSetupAnswers(planningAnswers)
    : null

  const handleNext = async () => {
    if (isLast) return
    const nextStep = STEPS[currentIndex + 1]
    if (!nextStep) return

    if (isPlanningSetup) {
      if (!projectId || isSubmitting) return

      if (planningValidationError) {
        setSubmitError(planningValidationError)
        return
      }

      const intakeSubmissionKey = `${projectId}:${planning ?? ''}`

      if (lastSubmittedIntakeKey === intakeSubmissionKey) {
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
        return
      }

      setSubmitting(true)
      setSubmitError(null)

      try {
        await submitIntake(projectId, mapPlanningSetupAnswersToIntakeRequest(planningAnswers))
        markIntakeSubmitted(intakeSubmissionKey)
        router.push(buildStepPath(nextStep.path, { projectId, planning }))
      } catch (error) {
        setSubmitError(
          error instanceof Error
            ? error.message
            : '기획 프리세팅 제출에 실패했습니다.'
        )
      } finally {
        setSubmitting(false)
      }

      return
    }

    if (isAiPlanning) {
      if (!projectId || !canProceedAiPlanning || isAdvancingAiPlanning) {
        return
      }

      setAdvancingAiPlanning(true)

      try {
        if (aiPlanningNextTarget === 'chatbot') {
          let enteredPlanningSession: PlanningSession | null = null

          if (planningSessionId) {
            enteredPlanningSession = await postPlanningMessage(projectId, {
              message: [
                'AI 기획 pt.1 질문 답변을 마치고 pt.2 대화 단계로 진입합니다.',
                `answered_count=${answeredQuestionIds.length}`,
                '이전 slot_answer payload들을 기준으로 다음 대화와 최종 기획안 생성을 이어가 주세요.',
              ].join('\n'),
              messageType: 'planning_workspace_entered',
              payload: {
                event_type: 'planning_workspace_entered',
                planning_session_id: planningSessionId,
                answer_source: 'planning_pt1',
                answered_question_ids: answeredQuestionIds,
                answered_count: answeredQuestionIds.length,
                selected_angle_id: null,
              },
            }).catch(() => null)
          }

          const routingSession = await waitPt2RoutingSession(projectId, enteredPlanningSession)

          if (
            routingSession &&
            !hasPt2PlanningQuestions(routingSession) &&
            (canFinalizePlanning(routingSession) || routingSession.readyForApproval)
          ) {
            if (!routingSession.readyForApproval) {
              await postPlanningMessage(projectId, {
                message: '수집된 PT1/PT2 정보를 바탕으로 최종 기획안 생성을 시작합니다.',
                messageType: 'finalize_planning',
                payload: {
                  event_type: 'finalize_planning',
                  planning_session_id: routingSession.planningSessionId,
                },
              })
            }

            const brief = await waitReviewReadyBrief(projectId)
            const approvedBriefVersionId = await resolveApprovedBriefVersionId(
              projectId,
              brief.briefVersionId,
              brief.status
            )
            const generation = await startGeneration(projectId, {
              briefVersionId: approvedBriefVersionId,
              generationMode: 'single',
              variantCount: 1,
            })
            const params = new URLSearchParams({
              projectId,
              generationRequestId: generation.generationRequestId,
            })
            if (planning) {
              params.set('planning', planning)
            }
            router.push(`${nextStep.path}?${params.toString()}`)
            return
          }

          const params = new URLSearchParams({ projectId })
          if (planning) {
            params.set('planning', planning)
          }
          params.set('mode', 'chatbot')
          router.push(`/ai-planning?${params.toString()}`)
          return
        }

        if (aiPlanningNextTarget === 'shooting-guide') {
          if (isChatbotMode && briefVersionId) {
            const approvedBriefVersionId = await resolveApprovedBriefVersionId(
              projectId,
              briefVersionId,
              briefStatus
            )
            const generation = await startGeneration(projectId, {
              briefVersionId: approvedBriefVersionId,
              generationMode: 'single',
              variantCount: 1,
            })
            const params = new URLSearchParams({
              projectId,
              generationRequestId: generation.generationRequestId,
            })
            if (planning) {
              params.set('planning', planning)
            }
            router.push(`${nextStep.path}?${params.toString()}`)
            return
          }

          router.push(buildStepPath(nextStep.path, { projectId, planning }))
          return
        }
      } finally {
        setAdvancingAiPlanning(false)
      }

      return
    }

    router.push(buildStepPath(nextStep.path, { projectId, planning }))
  }

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      {/* 다음 버튼 */}
      <div
        className="absolute left-0 right-0 flex justify-center"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <StepNavButton
          direction="next"
          onClick={() => {
            void handleNext()
          }}
          hidden={isLast}
          disabled={
            isSubmitting ||
            (isAiPlanning &&
              (!canProceedAiPlanning || isAdvancingAiPlanning))
          }
        />
      </div>
    </aside>
  )
}
