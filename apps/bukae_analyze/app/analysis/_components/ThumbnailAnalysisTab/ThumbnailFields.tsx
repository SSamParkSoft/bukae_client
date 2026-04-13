import type { ThumbnailAnalysisViewModel } from '@/features/videoAnalysis/types/viewModel'
import { AiBadge, SectionLabel } from '../shared'

type FieldDef = {
  label: string
  ai?: true
  content: React.ReactNode
}

function buildFields(data: ThumbnailAnalysisViewModel): FieldDef[] {
  const text = (value: string, className = '') => (
    <p className={`text-sm ${className}`.trim()}>{value}</p>
  )

  const fields: (FieldDef | null)[] = [
    { label: '메인 텍스트', content: text(data.mainText, 'font-medium') },
    { label: '텍스트 비율', ai: true, content: text(data.textRatioPercent, 'font-medium') },
    { label: '레이아웃 구성', ai: true, content: text(data.layoutComposition, 'text-black/70 leading-relaxed') },
    { label: 'CTR 등급', ai: true, content: text(data.ctrGrade, 'font-semibold') },
    {
      label: '주요 색상',
      content: (
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {data.colors.map((color) => (
            <div key={color} className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs text-black/50 font-mono">{color}</span>
            </div>
          ))}
        </div>
      ),
    },
    data.facePresence ? { label: '얼굴 노출', content: text(data.facePresence) } : null,
    data.numberEmphasis ? { label: '숫자 강조', content: text(data.numberEmphasis) } : null,
    data.emotionTrigger ? { label: '감정 유발', content: text(data.emotionTrigger) } : null,
  ]

  return fields.filter((f): f is FieldDef => f !== null)
}

export function ThumbnailFields({ data }: { data: ThumbnailAnalysisViewModel }) {
  return (
    <div className="flex-1 flex flex-col gap-5">
      {buildFields(data).map(({ label, ai, content }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-1">
            <SectionLabel>{label}</SectionLabel>
            {ai && <AiBadge />}
          </div>
          {content}
        </div>
      ))}
    </div>
  )
}
