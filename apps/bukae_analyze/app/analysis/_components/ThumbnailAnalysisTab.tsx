import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'

function FieldValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/4 px-6 py-2">
      <div className="min-w-0 wrap-break-word font-16-rg leading-[1.8] text-white/80">{children}</div>
    </div>
  )
}

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <p className="font-16-md text-white/60">{label}</p>
      <FieldValueBox>{children}</FieldValueBox>
    </div>
  )
}

function ColorsValue({ colors }: { colors: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
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
      left: { label: '메인 텍스트' as const, node: <p>{data.mainText}</p> },
      right: { label: '주요 색상' as const, node: <ColorsValue colors={data.colors} /> },
    },
    {
      left: { label: '텍스트 비율' as const, node: <p>{data.textRatioPercent}</p> },
      right: { label: '얼굴 노출' as const, node: <p>{face}</p> },
    },
    {
      left: { label: '레이아웃 구성' as const, node: <p>{data.layoutComposition}</p> },
      right: { label: '숫자 강조' as const, node: <p>{numberEmphasis}</p> },
    },
    {
      left: { label: 'CTR 등급' as const, node: <p>{data.ctrGrade}</p> },
      right: { label: '감정 유발' as const, node: <p>{emotion}</p> },
    },
  ]

  return (
    <div className="py-8">
      <div className="flex flex-col gap-6 rounded-xl border border-white/10 bg-white/10 px-6 py-8 backdrop-blur-[2px]">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FieldCell label={row.left.label}>{row.left.node}</FieldCell>
            <FieldCell label={row.right.label}>{row.right.node}</FieldCell>
          </div>
        ))}
      </div>
    </div>
  )
}
