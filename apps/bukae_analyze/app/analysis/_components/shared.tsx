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
    <div className="border-2 border-white rounded-xl p-5">
      <p className="text-xs font-bold text-white/50 mb-2">★ 핵심 분석</p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

export function EvidenceList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-white/60">
          <span className="mt-0.5 shrink-0 text-white/30">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
