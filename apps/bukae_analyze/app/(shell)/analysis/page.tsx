import { redirect } from 'next/navigation'
import { PageTitle } from '@/components/page/PageTitle'
import { AnalysisPageProvider } from '@/features/analysisPage/context/AnalysisPageContext'
import { fetchAnalysisBootstrap } from '@/lib/server/analysisBootstrap'
import { getServerAccessToken } from '@/lib/server/authSession'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { AnalysisPageContent } from './_components/AnalysisPageContent'
import { AnalysisReferenceUrlBar } from './_components/AnalysisReferenceUrlBar'

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string | string[] }>
}) {
  const { projectId } = await searchParams
  const initialProjectId = resolveSingleSearchParam(projectId)

  if (!initialProjectId) {
    redirect('/')
  }

  const accessToken = await getServerAccessToken()
  const initialSnapshot = accessToken
    ? await fetchAnalysisBootstrap({
      accessToken,
      projectId: initialProjectId,
    }).catch(() => null)
    : null

  return (
    <AnalysisPageProvider
      key={initialProjectId}
      initialProjectId={initialProjectId}
      initialSnapshot={initialSnapshot}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <AnalysisReferenceUrlBar className="mb-10" />
        <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
        <hr className="mb-10 border-b border-white/10" />
        <AnalysisPageContent />
      </div>
    </AnalysisPageProvider>
  )
}
