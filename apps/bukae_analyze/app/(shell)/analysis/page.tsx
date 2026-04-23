import { PageTitle } from '@/components/page/PageTitle'
import { AnalysisPageProvider } from '@/features/analysisPage/context/AnalysisPageContext'
import { AnalysisPageContent } from './_components/AnalysisPageContent'
import { AnalysisReferenceUrlBar } from './_components/AnalysisReferenceUrlBar'

function resolveProjectId(
  projectId: string | string[] | undefined
): string | null {
  if (typeof projectId === 'string') return projectId
  if (Array.isArray(projectId)) return projectId[0] ?? null
  return null
}

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string | string[] }>
}) {
  const { projectId } = await searchParams
  const initialProjectId = resolveProjectId(projectId)

  return (
    <AnalysisPageProvider initialProjectId={initialProjectId}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <AnalysisReferenceUrlBar className="mb-10" />
        <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
        <hr className="mb-10 border-b border-white/10" />
        <AnalysisPageContent />
      </div>
    </AnalysisPageProvider>
  )
}
