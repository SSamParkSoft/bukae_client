import { redirect } from 'next/navigation'
import { PageTitle } from '@/components/page/PageTitle'
import {
  AnalysisPageContent,
  AnalysisPageProvider,
  AnalysisReferenceUrlBar,
} from '@/features/analysisPage'
import { resolveAppError, type ResolvedAppError } from '@/lib/errors/appError'
import { fetchAnalysisBootstrap } from '@/lib/server/analysisBootstrap'
import { getServerAccessToken } from '@/lib/server/authSession'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'
import { FeedbackPrompt, type FeedbackPromptContent } from '@/components/feedback/FeedbackPrompt'

const ANALYSIS_FEEDBACK_PROMPT: FeedbackPromptContent = {
  promptId: 'analysis',
  title: 'AI 분석 결과가 기대에 맞았나요?',
  description: '분석 내용이 부족하거나 더 보고 싶은 관점이 있다면 알려주세요.',
}

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
  let initialSnapshot = null
  let initialError: ResolvedAppError | null = null

  if (accessToken) {
    try {
      initialSnapshot = await fetchAnalysisBootstrap({
        accessToken,
        projectId: initialProjectId,
      })
    } catch (error) {
      initialError = resolveAppError(error, 'analysis_bootstrap')
    }
  }

  return (
    <AnalysisPageProvider
      key={initialProjectId}
      initialProjectId={initialProjectId}
      initialSnapshot={initialSnapshot}
      initialError={initialError}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <AnalysisReferenceUrlBar className="mb-10" />
        <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
        <hr className="mb-10 border-b border-white/10" />
        <FeedbackPrompt
          projectId={initialProjectId}
          content={ANALYSIS_FEEDBACK_PROMPT}
          className="mb-10"
        />
        <AnalysisPageContent />
      </div>
    </AnalysisPageProvider>
  )
}
