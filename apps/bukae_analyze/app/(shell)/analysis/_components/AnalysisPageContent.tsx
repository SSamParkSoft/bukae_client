'use client'

import { AnalysisLoadingOverlay } from '@/components/loading/AnalysisLoadingOverlay'
import { useAnalysisPageContext } from '@/features/analysisPage/context/AnalysisPageContext'
import { AnalysisErrorView } from './AnalysisErrorView'
import { AnalysisInsightPanel } from './AnalysisInsightPanel'
import { AnalysisVideoPanel } from './AnalysisVideoPanel'
import { HookAnalysisTab } from './HookAnalysisTab'
import { PageTabs } from './PageTabs'
import { ThumbnailAnalysisTab } from './ThumbnailAnalysisTab'
import {
  VideoStructureDetailSections,
  VideoStructureTab,
} from './VideoStructureTab'

export function AnalysisPageContent() {
  const {
    hasProject,
    activeTab,
    setActiveTab,
    tabs,
    viewModel,
    videoSrc,
    isReady,
    isLoading,
    isFailed,
    errorType,
    errorMessage,
  } = useAnalysisPageContext()

  if (!hasProject) return null

  return (
    <div className="relative flex min-w-0 flex-1 flex-col pt-10 pb-32">
      <AnalysisLoadingOverlay visible={isLoading} />

      {isFailed && <AnalysisErrorView errorType={errorType} errorMessage={errorMessage} />}

      {isReady && (
        <>
          <div className="flex min-w-0 gap-x-[38.25px]">
            <AnalysisVideoPanel
              posterUrl={viewModel.thumbnail.imageUrl}
              videoSrc={videoSrc}
            />

            <div className="flex h-[572px] min-w-0 max-w-[1000px] flex-1 flex-col">
              <PageTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
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
        </>
      )}
    </div>
  )
}
