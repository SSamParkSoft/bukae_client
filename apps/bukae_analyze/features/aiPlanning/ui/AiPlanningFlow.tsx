'use client'

import { createAppError } from '@/lib/errors/appError'
import { useAiPlanningRouter } from '@/features/aiPlanning/hooks/state/useAiPlanningRouter'
import { FollowUpPlanningView } from './FollowUpPlanningView'
import { PlanningSessionError } from './PlanningSessionError'
import { PlanningSessionLoading } from './PlanningSessionLoading'
import { Pt1PlanningView } from './Pt1PlanningView'
import type { FeedbackPromptContent } from '@/components/feedback/FeedbackPromptBanner'

type AiPlanningMode = 'default' | 'chatbot'

export function AiPlanningFlow({
  projectId,
  mode,
  generationRequestId,
  feedbackPrompt,
}: {
  projectId: string
  mode: AiPlanningMode
  generationRequestId: string | null
  feedbackPrompt?: FeedbackPromptContent
}) {
  const { pt1, chatbot, stage } = useAiPlanningRouter({
    projectId,
    isChatbotMode: mode === 'chatbot',
    generationRequestId,
  })

  if (mode === 'chatbot') {
    return (
      <FollowUpPlanningView
        data={chatbot}
        projectId={projectId}
        feedbackPrompt={feedbackPrompt}
      />
    )
  }
  if (pt1.errorMessage) return <PlanningSessionError message={pt1.errorMessage} appError={pt1.appError} />
  if (pt1.saveError) return <PlanningSessionError message={pt1.saveError.message} appError={pt1.saveError} />
  if (stage === 'pt1_preparing_questions') return <PlanningSessionLoading />
  if (stage === 'planning_unavailable') return <PlanningSessionError message='생성된 PT1 질문이 없습니다. 기획 프리세팅 제출 상태를 확인해 주세요.' appError={createAppError('invalid_project_state', 'planning_session_fetch')} />

  return <Pt1PlanningView {...pt1.viewProps} />
}
