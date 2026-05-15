import { redirect } from 'next/navigation'
import { PageTitle } from '@/components/page/PageTitle'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { AiPlanningFlow } from '@/features/aiPlanning'
import { FeedbackPrompt, type FeedbackPromptContent } from '@/components/feedback/FeedbackPrompt'
import { buildAnalyzeWorkflowStepPath } from '@/features/analyzeWorkflow/lib/analyzeWorkflowSteps'

type AiPlanningMode = 'default' | 'chatbot'

const AI_PLANNING_CHATBOT_FEEDBACK_PROMPT: FeedbackPromptContent = {
  promptId: 'ai-planning-chatbot',
  title: 'AI와 기획을 다듬는 과정은 어땠나요?',
  description: '질문 흐름이나 답변 경험에서 불편했던 점을 알려주시면 기획 품질 개선에 반영할게요.',
}

const AI_PLANNING_FEEDBACK_PROMPT: FeedbackPromptContent = {
  promptId: 'ai-planning',
  title: 'AI 기획 질문이 도움이 됐나요?',
  description: '질문이 모호하거나 답하기 어려운 부분이 있었다면 알려주세요.',
}

function resolveMode(mode: string | null): AiPlanningMode {
  return mode === 'chatbot' ? 'chatbot' : 'default'
}

export default async function AiPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[]
    projectId?: string | string[]
    generationRequestId?: string | string[]
  }>
}) {
  const { generationRequestId, mode, projectId } = await searchParams
  const resolvedProjectId = resolveSingleSearchParam(projectId)
  const resolvedGenerationRequestId = resolveSingleSearchParam(generationRequestId)

  if (!resolvedProjectId) {
    redirect('/')
  }

  const resolvedMode = resolveMode(resolveSingleSearchParam(mode))

  if (resolvedGenerationRequestId) {
    redirect(buildAnalyzeWorkflowStepPath('/shooting-guide', {
      projectId: resolvedProjectId,
      generationRequestId: resolvedGenerationRequestId,
    }))
  }

  if (resolvedMode === 'chatbot') {
    return (
      <AiPlanningFlow
        projectId={resolvedProjectId}
        mode={resolvedMode}
        generationRequestId={resolvedGenerationRequestId}
        feedbackPrompt={AI_PLANNING_CHATBOT_FEEDBACK_PROMPT}
      />
    )
  }

  return (
    <div className="pt-10">
      <PageTitle
        title="AI 기획"
        description="레퍼런스 영상 분석을 바탕으로 질문에 답해 주세요. AI가 다음 영상의 기획 방향을 제안해 드릴게요."
      />
      <div className="mx-6 mt-6 mb-10 h-px bg-white/40" />
      <div className="mx-6 mb-10">
        <FeedbackPrompt
          projectId={resolvedProjectId}
          content={AI_PLANNING_FEEDBACK_PROMPT}
        />
      </div>
      <AiPlanningFlow
        projectId={resolvedProjectId}
        mode={resolvedMode}
        generationRequestId={resolvedGenerationRequestId}
      />
    </div>
  )
}
