'use client'

import { useState } from 'react'
import { MOCK_REFERENCE_VIDEO_URL, MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'
import { AnalysisVideoPanel } from './_components/AnalysisVideoPanel'
import { ThumbnailAnalysisTab } from './_components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from './_components/HookAnalysisTab'
// import { CommentAnalysisTab } from './_components/CommentAnalysisTab' // MVP 제외: 댓글 반응 분석
import { VideoStructureTab } from './_components/VideoStructureTab'
import { PageTitle } from '@/components/pageShared/PageTitle'
import { ReferenceUrlTopBar } from './_components/ReferenceUrlTopBar'
import { PageTabs } from '@/components/ui/analysis/PageTabs'

const REFERENCE_URL_DISPLAY = 'youtube.com/shorts/contentruckai'

const TABS = [
  { id: 'thumbnail', label: '썸네일 분석' },
  { id: 'hook', label: '훅 분석' },
  // { id: 'comment', label: '댓글 반응 분석' }, // MVP 제외: 댓글 반응 분석
  { id: 'structure', label: '영상 구조 분석' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabId>('thumbnail')
  const viewModel = useVideoAnalysisViewModel(MOCK_VIDEO_ANALYSIS)

  return (
    <div
      className={[
        'flex min-h-0 min-w-0 flex-1 flex-col px-8 pb-16 pt-10',
        'lg:grid lg:grid-cols-[min(46vw,560px)_1fr] lg:grid-rows-[auto_auto_auto_auto_auto] lg:gap-x-0 lg:px-8 lg:pb-16 lg:pt-10',
      ].join(' ')}
    >
      <ReferenceUrlTopBar
        referenceUrl={REFERENCE_URL_DISPLAY}
        className="mb-10 lg:col-span-2 lg:row-start-1"
      />

        <PageTitle title="AI 분석" description="원본 영상의 핵심 요소를 파악했습니다" />

      <hr className="mb-10 border-b border-white/10 lg:col-span-2 lg:row-start-3 lg:mb-10" />

      <div className="lg:col-start-2 lg:row-start-4">
        <PageTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      <AnalysisVideoPanel
        posterUrl={MOCK_VIDEO_ANALYSIS.thumbnail.imageUrl}
        videoSrc={MOCK_REFERENCE_VIDEO_URL}
        className="mb-6 lg:col-start-1 lg:mb-0 lg:row-[4/-1]"
      />

      <div className="min-w-0 lg:col-start-2 lg:row-start-5">
        {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
        {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
        {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
      </div>
    </div>
  )
}
