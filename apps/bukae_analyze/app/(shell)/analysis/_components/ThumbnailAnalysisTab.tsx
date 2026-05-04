import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { WhyBox } from './AnalysisPrimitives'

function FieldValueBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-2">
      <div className="font-16-rg leading-[1.4] text-white/80">
        {children ?? '—'}
      </div>
    </div>
  )
}

function FieldCell({
  label,
  children,
  cellClassName,
}: {
  label: string
  children: React.ReactNode
  cellClassName?: string
}) {
  return (
    <div
      className={[
        'flex min-w-0 flex-col gap-2',
        cellClassName ?? 'h-[clamp(64px, 1.04vw, 76px)]',
      ].join(' ')}
    >
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

const metricsCellClass = 'h-auto min-h-[clamp(64px,1.04vw,76px)]'

interface Props {
  data: ThumbnailAnalysisViewModel
}

export function ThumbnailAnalysisTab({ data }: Props) {
  const face = data.facePresence ?? '—'
  const numberEmphasis = data.numberEmphasis ?? '—'
  const emotion = data.emotionTrigger ?? '—'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-6 px-6 pt-6 backdrop-blur-[2px]">
        <div className="flex flex-col gap-3">
          <FieldCell label="메인 텍스트">{data.mainText}</FieldCell>
          <FieldCell label="레이아웃 구성">{data.layoutComposition}</FieldCell>
          <FieldCell label="주요 색상"><ColorsValue colors={data.colors} /></FieldCell>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <FieldCell label="텍스트 비율" cellClassName={metricsCellClass}>{data.textRatioPercent}</FieldCell>
          <FieldCell label="얼굴 노출" cellClassName={metricsCellClass}>{face}</FieldCell>
          <FieldCell label="숫자 강조" cellClassName={metricsCellClass}>{numberEmphasis}</FieldCell>
          <FieldCell label="CTR 등급" cellClassName={metricsCellClass}>{data.ctrGrade}</FieldCell>
          <FieldCell label="감정 유발" cellClassName={metricsCellClass}>{emotion}</FieldCell>
        </div>
      </div>
      {data.why && data.why.length > 0 ? <WhyBox sentences={data.why} /> : null}
    </div>
  )
}
