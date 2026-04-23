import { redirect } from 'next/navigation'
import { PageTitle } from '@/components/page/PageTitle'
import { parsePlanningSetupAnswers } from '@/lib/utils/planningSetupQuery'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { AiPlanningPageClient } from './_components/AiPlanningPageClient'

type AiPlanningMode = 'default' | 'chatbot'

function resolveMode(mode: string | null): AiPlanningMode {
  return mode === 'chatbot' ? 'chatbot' : 'default'
}

export default async function AiPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[]
    planning?: string | string[]
    projectId?: string | string[]
  }>
}) {
  const { mode, planning, projectId } = await searchParams
  const resolvedProjectId = resolveSingleSearchParam(projectId)
  const resolvedPlanning = resolveSingleSearchParam(planning)

  if (!resolvedProjectId) {
    redirect('/')
  }

  const resolvedMode = resolveMode(resolveSingleSearchParam(mode))
  const initialPlanningAnswers = parsePlanningSetupAnswers(resolvedPlanning)

  if (resolvedMode === 'chatbot') {
    return (
      <AiPlanningPageClient
        projectId={resolvedProjectId}
        mode={resolvedMode}
        initialPlanningAnswers={initialPlanningAnswers}
        planningParam={resolvedPlanning}
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
      <AiPlanningPageClient
        projectId={resolvedProjectId}
        mode={resolvedMode}
        initialPlanningAnswers={initialPlanningAnswers}
        planningParam={resolvedPlanning}
      />
    </div>
  )
}
