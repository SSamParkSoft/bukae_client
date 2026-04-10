'use client'

import { useState } from 'react'
import { MOCK_VIDEO_ANALYSIS } from '@/lib/mocks'
import { useVideoAnalysisViewModel } from '@/features/videoAnalysis/hooks/useVideoAnalysisViewModel'
import { ThumbnailAnalysisTab } from '@/features/videoAnalysis/components/ThumbnailAnalysisTab'
import { HookAnalysisTab } from '@/features/videoAnalysis/components/HookAnalysisTab'
import { CommentAnalysisTab } from '@/features/videoAnalysis/components/CommentAnalysisTab'
import { VideoStructureTab } from '@/features/videoAnalysis/components/VideoStructureTab'

const TABS = [
  { id: 'thumbnail', label: '썸네일 분석' },
  { id: 'hook', label: '훅 분석' },
  { id: 'comment', label: '댓글 반응 분석' },
  { id: 'structure', label: '영상 구조 분석' },
] as const

type TabId = (typeof TABS)[number]['id']

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabId>('thumbnail')
  const viewModel = useVideoAnalysisViewModel(MOCK_VIDEO_ANALYSIS)

  return (
    <div className="px-8 pt-10 pb-16">
      {/* 헤더 */}
      <section className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight mb-2">AI 분석</h1>
        <p className="text-sm text-black/50 leading-relaxed">
          영상의 썸네일, 훅, 댓글 반응, 구조를 AI가 분석했어요.
          <br />
          각 항목에서 성공 요인과 근거를 확인할 수 있어요.
        </p>
      </section>

      {/* 탭바 */}
      <div className="border-b border-black/10 flex gap-0 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'shrink-0 px-4 pb-3 text-sm font-medium transition-colors relative',
                isActive
                  ? 'text-black'
                  : 'text-black/40 hover:text-black/70',
              ].join(' ')}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-t-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'thumbnail' && <ThumbnailAnalysisTab data={viewModel.thumbnail} />}
      {activeTab === 'hook' && <HookAnalysisTab data={viewModel.hook} />}
      {activeTab === 'comment' && <CommentAnalysisTab data={viewModel.comment} />}
      {activeTab === 'structure' && <VideoStructureTab data={viewModel.structure} />}
    </div>
  )
}
