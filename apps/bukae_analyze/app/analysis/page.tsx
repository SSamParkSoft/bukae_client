'use client'

import { useState } from 'react'
import { MOCK_REFERENCE_VIDEO_URL, MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'
import { AnalysisVideoPanel } from './_components/AnalysisVideoPanel'
import { ThumbnailAnalysisTab } from './_components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from './_components/HookAnalysisTab'
// import { CommentAnalysisTab } from './_components/CommentAnalysisTab' // MVP 제외: 댓글 반응 분석
import { VideoStructureDetailSections, VideoStructureTab } from './_components/VideoStructureTab'
import { PageTitle } from '@/components/pageShared/PageTitle'
import { ReferenceUrlTopBar } from './_components/ReferenceUrlTopBar'
import { PageTabs } from '@/components/ui/analysis/PageTabs'
import { AnalysisInsightPanel } from './_components/AnalysisInsightPanel'

const REFERENCE_URL_DISPLAY = 'youtube.com/shorts/contentruckai'

const TABS = [
  { id: 'thumbnail', label: 'Thumbnail 분석' },
  { id: 'hook', label: 'Hook 분석' },
  // { id: 'comment', label: '댓글 반응 분석' }, // MVP 제외: 댓글 반응 분석
  { id: 'structure', label: 'Video Structure 분석' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabId>('thumbnail')
  const viewModel = useVideoAnalysisViewModel(MOCK_VIDEO_ANALYSIS)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pb-16 pt-10">
      <ReferenceUrlTopBar referenceUrl={REFERENCE_URL_DISPLAY} className="mb-10" />
      <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />
      <hr className="mb-10 border-b border-white/10" />

      <div className="flex min-w-0 gap-x-[38.25px]">
        <AnalysisVideoPanel
          posterUrl={MOCK_VIDEO_ANALYSIS.thumbnail.imageUrl}
          videoSrc={MOCK_REFERENCE_VIDEO_URL}
        />

        <div className="flex min-w-0 max-w-[1000px] flex-1 flex-col">
          <PageTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          <div className="min-w-0">
            {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
            {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
            {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
          </div>
        </div>
      </div>

      {activeTab === 'thumbnail' && (
        <AnalysisInsightPanel why={viewModel.thumbnail.why} evidence={viewModel.thumbnail.evidence} />
      )}
      {activeTab === 'hook' && (
        <AnalysisInsightPanel why={viewModel.hook.why} evidence={viewModel.hook.evidence} />
      )}
      {activeTab === 'structure' && (
        <VideoStructureDetailSections data={viewModel.structure} />
      )}
    </div>
  )
}
