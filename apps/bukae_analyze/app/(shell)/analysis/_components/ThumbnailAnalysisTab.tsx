import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { WhyBox } from './AnalysisPrimitives'

function FieldValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-2">
      <div className="truncate font-16-rg leading-[1.4] text-white/80">
        {children ?? '—'}
      </div>
    </div>
  )
}

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="h-[clamp(64px, 1.04vw, 76px)] flex min-w-0 flex-col gap-2">
      <p className="font-medium tracking-[-0.04em] text-white/60" style={{ fontSize: 'clamp(14px, 0.86vw, 16px)' }}>{label}</p>
      <FieldValueBox>{children}</FieldValueBox>
    </div>
  )
}

function ColorsValue({ colors }: { colors: string[] }) {
  if (colors.length === 0) return <span>—</span>

  return (
    <div className="flex flex-nowrap items-center gap-3">
      {colors.map((color) => (
        <div key={color} className="flex items-center gap-1.5">
          <div
            className="size-5 shrink-0 rounded-full border border-white/15"
            style={{ backgroundColor: color }}
          />
          <span className="font-mono text-sm text-white/70">{color}</span>
        </div>
      ))}
    </div>
  )
}

interface Props {
  data: ThumbnailAnalysisViewModel
}

export function ThumbnailAnalysisTab({ data }: Props) {
  const face = data.facePresence ?? '—'
  const numberEmphasis = data.numberEmphasis ?? '—'
  const emotion = data.emotionTrigger ?? '—'

  const rows = [
    {
      left: { label: '메인 텍스트' as const, node: data.mainText },
      right: { label: '주요 색상' as const, node: <ColorsValue colors={data.colors} /> },
    },
    {
      left: { label: '텍스트 비율' as const, node: data.textRatioPercent },
      right: { label: '얼굴 노출' as const, node: face },
    },
    {
      left: { label: '레이아웃 구성' as const, node: data.layoutComposition },
      right: { label: '숫자 강조' as const, node: numberEmphasis },
    },
    {
      left: { label: 'CTR 등급' as const, node: data.ctrGrade },
      right: { label: '감정 유발' as const, node: emotion },
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 px-6 pt-6 backdrop-blur-[2px]">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FieldCell label={row.left.label}>{row.left.node}</FieldCell>
            <FieldCell label={row.right.label}>{row.right.node}</FieldCell>
          </div>
        ))}
      </div>
      {data.why && <WhyBox>{data.why}</WhyBox>}
    </div>
  )
}
