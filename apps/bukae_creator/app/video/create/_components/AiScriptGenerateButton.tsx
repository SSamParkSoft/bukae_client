'use client'

import Image from 'next/image'

interface AiScriptGenerateButtonProps {
  onClick: () => void
  loading?: boolean
}

export function AiScriptGenerateButton({ onClick, loading = false }: AiScriptGenerateButtonProps) {
  return (
    <div className="m-6">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full h-14 sm:h-[82px] rounded-2xl bg-[#5e8790] text-white hover:bg-[#5e8790]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-card-default)]"
      >
        <Image
          src="/Subtract.svg"
          alt="AI"
          width={68}
          height={34}
          className="shrink-0"
        />
        <span
          className="font-bold tracking-[-0.48px]"
          style={{
            fontSize: 'var(--font-size-24)',
            lineHeight: '33.6px',
          }}
        >
          {loading ? 'AI 스크립트 생성 중...' : 'AI 스크립트 생성'}
        </span>
      </button>
    </div>
  )
}
