'use client'

import { AnimatePresence } from 'framer-motion'
import { LAYOUT } from '@/lib/config/layout'
import { useAnalyzeWorkflowNextStep } from '@/features/analyzeWorkflow/useAnalyzeWorkflowNextStep'
import { WorkflowStepArrowButton } from '@/features/analyzeWorkflow/ui/WorkflowStepArrowButton'
import {
  WorkflowStepStatusCards,
  type WorkflowStepStatusCard,
} from '@/features/analyzeWorkflow/ui/WorkflowStepStatusCards'
import { useAiPlanningStore } from '@/store/useAiPlanningStore'

const PT1_SAVE_STATUS_CARDS: WorkflowStepStatusCard[] = [
  {
    title: '정보가 충분한지 분석하고 있어요.',
    description: '잠시만 기다려주세요.',
  },
  {
    title: '다음 단계를 준비하고 있어요.',
    description: '저장이 끝나면 바로 이동할 수 있어요.',
  },
]

const PLANNING_SETUP_SUBMIT_STATUS_CARD: WorkflowStepStatusCard = {
  title: '기획 프리세팅을 저장하고 있어요.',
  description: '잠시만 기다려주세요.',
}

const GENERATION_START_STATUS_CARD: WorkflowStepStatusCard = {
  title: '답변을 저장하고 있어요.',
  description: '잠시만 기다려주세요.',
}

type WorkflowStepStatusContent = (
  | {
    key: string
    variant: 'single'
    card: WorkflowStepStatusCard
    cards?: never
  }
  | {
    key: string
    variant: 'stack'
    card?: never
    cards: WorkflowStepStatusCard[]
  }
)

function renderWorkflowStepStatusCards(
  statusContent: WorkflowStepStatusContent | null
) {
  if (!statusContent) return null

  if (statusContent.variant === 'single') {
    return (
      <WorkflowStepStatusCards
        key={statusContent.key}
        variant="single"
        card={statusContent.card}
      />
    )
  }

  return (
    <WorkflowStepStatusCards
      key={statusContent.key}
      variant="stack"
      cards={statusContent.cards}
    />
  )
}

export function AnalyzeWorkflowNextStepSidebar() {
  const {
    shouldRenderNextStepButton,
    isNextStepButtonDisabled,
    isSubmittingPlanningSetup,
    advanceToNextWorkflowStep,
  } = useAnalyzeWorkflowNextStep()
  const isSavingPt1Answers = useAiPlanningStore((state) => state.isSavingPt1Answers)
  const isAdvancingAiPlanning = useAiPlanningStore((state) => state.isAdvancing)
  const aiPlanningNextTarget = useAiPlanningStore((state) => state.nextTarget)
  const advanceError = useAiPlanningStore((state) => state.advanceError)
  const advanceErrorStatusCard: WorkflowStepStatusCard | null = advanceError
    ? {
      title: advanceError.title,
      description: advanceError.message,
      tone: 'error',
    }
    : null
  const statusContent: WorkflowStepStatusContent | null = advanceErrorStatusCard
    ? {
      key: 'ai-planning-advance-error',
      variant: 'single',
      card: advanceErrorStatusCard,
    }
    : isSubmittingPlanningSetup
    ? {
      key: 'planning-setup-submit-status',
      variant: 'single',
      card: PLANNING_SETUP_SUBMIT_STATUS_CARD,
    }
    : (isAdvancingAiPlanning && aiPlanningNextTarget === 'shooting-guide')
    ? {
      key: 'generation-start-status',
      variant: 'single' as const,
      card: GENERATION_START_STATUS_CARD,
    }
    : isSavingPt1Answers
      ? {
        key: 'pt1-save-status',
        variant: 'stack',
        cards: PT1_SAVE_STATUS_CARDS,
      }
      : null

  if (!shouldRenderNextStepButton) return null

  return (
    <aside
      className="relative shrink-0"
      style={{ width: LAYOUT.SIDEBAR_WIDTH }}
    >
      <div
        className="absolute left-0 right-0 flex flex-col items-center gap-3"
        style={{ bottom: LAYOUT.NAV_BUTTON_BOTTOM }}
      >
        <AnimatePresence>
          {renderWorkflowStepStatusCards(statusContent)}
        </AnimatePresence>

        <WorkflowStepArrowButton
          direction="next"
          onClick={() => {
            void advanceToNextWorkflowStep()
          }}
          disabled={isNextStepButtonDisabled}
        />
      </div>
    </aside>
  )
}
