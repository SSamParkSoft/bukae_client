import { redirect } from 'next/navigation'
import { PageTitle } from '@/components/page/PageTitle'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { PlanningSetupPageClient } from './_components/PlanningSetupPageClient'

export default async function PlanningSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string | string[] }>
}) {
  const { projectId } = await searchParams
  const resolvedProjectId = resolveSingleSearchParam(projectId)

  if (!resolvedProjectId) {
    redirect('/')
  }

  return (
    <div className="pt-10">
      <PageTitle
        title="기획 프리세팅"
        description="영상을 기획하기 전에 사전 설정하면, AI가 더 정확한 기획안을 제안해드릴 수 있어요."
      />
      <div className="mx-6 mt-6 mb-10 h-px bg-white/40" />
      <PlanningSetupPageClient />
    </div>
  )
}
