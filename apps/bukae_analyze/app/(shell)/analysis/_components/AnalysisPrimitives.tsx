/**
 * videoAnalysis 탭들이 공유하는 UI 프리미티브
 */

import { BulletSentenceList } from './VideoStructureTab/VideoStructurePrimitives'

export function AiBadge() {
  return (
    <span className="inline-block text-[10px] font-medium text-white/40 border border-white/20 rounded px-1.5 py-0.5 leading-none">
      AI 추정
    </span>
  )
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
      {children}
    </p>
  )
}

export function WhyBox({ sentences }: { sentences: string[] }) {
  if (sentences.length === 0) return null

  return (
    <div className="p-6 bg-white/10">
      <p className="mb-2 font-medium tracking-[-0.04em] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>★ 핵심 분석</p>
      <div className="px-6 pt-4" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>
        <BulletSentenceList
          sentences={sentences}
          itemClassName="whitespace-pre-line font-medium leading-[1.4] tracking-[-0.04em] text-white/80"
        />
      </div>
    </div>
  )
}

/** 분석 근거 목록 — 하단 보더 박스, 본문 단일 줄 말줄임 */
export function EvidenceList({ items }: { items: string[] }) {
  return (
    <div className="flex w-full flex-col gap-6">
      {items.map((item, i) => (
        <div key={i} className="min-w-0 backdrop-blur-[2px] border-b border-white/40 px-6 py-4">
          <p className="min-w-0 truncate font-16-md tracking-[-0.04em] leading-[1.4] text-white/80" title={item}>
            {item}
          </p>
        </div>
      ))}
    </div>
  )
}

export function CrossValidationBox({ match, evidence }: { match: boolean; evidence: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{match ? '✓' : '✗'}</span>
        <p className="text-xs font-semibold">
          {match ? '댓글 데이터와 일치' : '댓글 데이터와 불일치'}
        </p>
      </div>
      <p className="text-sm text-white/60">{evidence}</p>
    </div>
  )
}
