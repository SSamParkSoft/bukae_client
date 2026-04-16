/**
 * videoAnalysis 탭들이 공유하는 UI 프리미티브
 */

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

export function WhyBox({ children }: { children: string }) {
  return (
    <div className="border border-white p-6 bg-white/10">
      <p className="font-20-md text-white/60 mb-2">★ 핵심 분석</p>
      <p className="font-20-md leading-relaxed text-white/80 pt-4 px-6">{children}</p>
    </div>
  )
}

/** 분석 근거 목록 — 하단 보더 박스, 본문 단일 줄 말줄임 */
export function EvidenceList({ items }: { items: string[] }) {
  return (
    <div className="flex w-full flex-col gap-6">
      {items.map((item, i) => (
        <div key={i} className="min-w-0 backdrop-blur-[2px] border-b border-white/40 px-6 py-4">
          <p className="min-w-0 truncate font-20-md leading-[1.8] text-white/80" title={item}>
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
