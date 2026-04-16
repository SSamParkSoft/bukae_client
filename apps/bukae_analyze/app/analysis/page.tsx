'use client'

import { useState } from 'react'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/viewmodel/useVideoAnalysisViewModel'
import { ThumbnailAnalysisTab } from './_components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from './_components/HookAnalysisTab'
// import { CommentAnalysisTab } from './_components/CommentAnalysisTab' // MVP 제외: 댓글 반응 분석
import { VideoStructureTab } from './_components/VideoStructureTab'
import { PageTitle } from '@/components/pageShared/PageTitle'
import { PageTabs } from '@/components/ui/analysis/PageTabs'

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
    <div className="px-8 pt-10 pb-16">
      <PageTitle
        title="AI 분석"
        description={[
          '영상의 썸네일, 훅, 구조를 AI가 분석했어요.',
          '각 항목에서 성공 요인과 근거를 확인할 수 있어요.',
        ]}
      />

      <PageTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* 탭 콘텐츠 */}
      {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
      {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
      {/* activeTab === 'comment' && <CommentAnalysisTab data={viewModel.comment} /> */}
      {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
    </div>
  )
}
