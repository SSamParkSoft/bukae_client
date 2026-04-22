'use client'

import { useAnalysisPage } from '@/features/analysisPage/hooks/state/useAnalysisPage'
import { AnalysisVideoPanel } from './_components/AnalysisVideoPanel'
import { ThumbnailAnalysisTab } from './_components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from './_components/HookAnalysisTab'
import { VideoStructureDetailSections, VideoStructureTab } from './_components/VideoStructureTab'
import { PageTitle } from '@/components/page/PageTitle'
import { ReferenceUrlTopBar } from './_components/ReferenceUrlTopBar'
import { PageTabs } from './_components/PageTabs'
import { AnalysisInsightPanel } from './_components/AnalysisInsightPanel'
import { AnalysisErrorView } from './_components/AnalysisErrorView'
import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'

export default function AnalysisPage() {
  const { hasProject, activeTab, setActiveTab, tabs, viewModel, referenceUrl, videoSrc, isReady, isLoading, isFailed, errorMessage } = useAnalysisPage()

  if (!hasProject) return null

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <ReferenceUrlTopBar referenceUrl={referenceUrl} className="mb-10" />
      <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
      <hr className="mb-10 border-b border-white/10" />

      {/* 오버레이는 PageTitle 아래 영역에만 적용 */}
      <div className="relative flex min-w-0 flex-1 flex-col pt-10 pb-32">
        <AnalysisLoadingOverlay visible={isLoading} />

        {isFailed && <AnalysisErrorView errorMessage={errorMessage} />}

        {isReady && (
          <>
            <div className="flex min-w-0 gap-x-[38.25px]">
              <AnalysisVideoPanel
                posterUrl={viewModel.thumbnail.imageUrl}
                videoSrc={videoSrc}
              />

              <div className="flex min-w-0 max-w-[1000px] flex-1 flex-col h-[572px]">
                <PageTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
                <div className="min-w-0 flex-1 overflow-y-auto scrollbar-hide">
                  {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
                  {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
                  {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
                </div>
              </div>
            </div>

            {activeTab === 'thumbnail' && <AnalysisInsightPanel evidence={viewModel.thumbnail.evidence} />}
            {activeTab === 'hook' && <AnalysisInsightPanel evidence={viewModel.hook.evidence} />}
            {activeTab === 'structure' && <VideoStructureDetailSections data={viewModel.structure} />}
          </>
        )}
      </div>
    </div>
  )
}
