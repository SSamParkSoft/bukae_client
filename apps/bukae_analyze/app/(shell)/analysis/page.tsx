'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MOCK_REFERENCE_VIDEO_URL, MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'
import { useAnalysisPolling } from '@/features/analysis/hooks/state/useAnalysisPolling'
import { useProjectStore } from '@/store/useProjectStore'
import { AnalysisVideoPanel } from './_components/AnalysisVideoPanel'
import { AnalysisLoadingPanel } from './_components/AnalysisLoadingPanel'
import { ThumbnailAnalysisTab } from './_components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from './_components/HookAnalysisTab'
import { VideoStructureDetailSections, VideoStructureTab } from './_components/VideoStructureTab'
import { PageTitle } from '@/components/pageShared/PageTitle'
import { ReferenceUrlTopBar } from './_components/ReferenceUrlTopBar'
import { PageTabs } from './_components/PageTabs'
import { AnalysisInsightPanel } from './_components/AnalysisInsightPanel'

const REFERENCE_URL_DISPLAY = 'youtube.com/shorts/contentruckai'

const TABS = [
  { id: 'thumbnail', label: 'Thumbnail 분석' },
  { id: 'hook', label: 'Hook 분석' },
  { id: 'structure', label: 'Video Structure 분석' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AnalysisPage() {
  const router = useRouter()
  const projectId = useProjectStore((s) => s.projectId)
  const [activeTab, setActiveTab] = useState<TabId>('thumbnail')
  const viewModel = useVideoAnalysisViewModel(MOCK_VIDEO_ANALYSIS)
  const { isCompleted, isFailed, isLoading, errorMessage } = useAnalysisPolling()

  useEffect(() => {
    if (!projectId) router.replace('/')
  }, [projectId, router])

  if (!projectId) return null

  if (isFailed) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
        <p className="font-20-md text-white">분석에 실패했습니다</p>
        {errorMessage && (
          <p className="font-14-rg text-white/60">{errorMessage}</p>
        )}
        <button
          onClick={() => router.replace('/')}
          className="rounded-full bg-white/10 px-6 py-3 font-14-md text-white hover:bg-white/20 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pb-32 pt-10">
        <ReferenceUrlTopBar referenceUrl={REFERENCE_URL_DISPLAY} className="mb-10" />
        <PageTitle title="AI 분석" description="레퍼런스 영상을 분석하고 있습니다" />
        <hr className="mb-10 border-b border-white/10" />

        <div className="flex min-w-0 gap-x-[38.25px]">
          <AnalysisLoadingPanel />

          <div className="flex min-w-0 max-w-[1000px] flex-1 flex-col h-[572px] items-center justify-center gap-4">
            <p className="font-16-md text-white/80">분석 중...</p>
            <p className="font-14-rg text-white/40">영상을 분석하고 있어요. 잠시만 기다려주세요.</p>
          </div>
        </div>
      </div>
    )
  }

  // isCompleted
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pb-32 pt-10">
      <ReferenceUrlTopBar referenceUrl={REFERENCE_URL_DISPLAY} className="mb-10" />
      <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
      <hr className="mb-10 border-b border-white/10" />

      <div className="flex min-w-0 gap-x-[38.25px]">
        <AnalysisVideoPanel
          posterUrl={MOCK_VIDEO_ANALYSIS.thumbnail.imageUrl}
          videoSrc={MOCK_REFERENCE_VIDEO_URL}
        />

        <div className="flex min-w-0 max-w-[1000px] flex-1 flex-col h-[572px]">
          <PageTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="min-w-0 flex-1 overflow-y-auto scrollbar-hide">
            {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
            {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
            {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
          </div>
        </div>
      </div>

      {activeTab === 'thumbnail' && (
        <AnalysisInsightPanel evidence={viewModel.thumbnail.evidence} />
      )}
      {activeTab === 'hook' && (
        <AnalysisInsightPanel evidence={viewModel.hook.evidence} />
      )}
      {activeTab === 'structure' && (
        <VideoStructureDetailSections data={viewModel.structure} />
      )}
    </div>
  )
}
