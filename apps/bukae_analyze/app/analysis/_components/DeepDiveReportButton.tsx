'use client'

import { ClipboardList } from 'lucide-react'

/**
 * 딥다이브 리포트 — 시안 전용 UI (클릭·라우팅 등 액션 없음, 추후 연결 시 onClick 등 추가)
 */
export function DeepDiveReportButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={[
        'inline-flex h-20 w-full max-w-[352px] shrink-0 cursor-default items-center justify-center rounded-[600px] bg-white/10 px-6 py-3 backdrop-blur-[2px]',
        className ?? '',
      ].join(' ')}
    >
      <span className="flex items-center gap-2">
        <ClipboardList className="size-6 shrink-0 text-white" strokeWidth={1.5} aria-hidden />
        <span className="font-20-md whitespace-nowrap text-white">딥다이브 리포트 분석 보기</span>
      </span>
    </button>
  )
}
