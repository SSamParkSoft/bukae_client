// import { DeepDiveReportButton } from './DeepDiveReportButton'

export function ReferenceUrlTopBar({
  referenceUrl,
  className,
}: {
  referenceUrl: string
  className?: string
}) {
  return (
    <div
      className={[
        'flex w-full min-w-0 flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-12',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
        <p className="font-semibold tracking-[-0.04em] leading-[1.4] shrink-0 text-white" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>레퍼런스 영상 URL</p>
        <p className="font-normal tracking-[-0.04em] leading-[1.4] min-w-0 truncate text-white/60" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }} title={referenceUrl}>
          {referenceUrl}
        </p>
      </div>
      {/* <DeepDiveReportButton /> */}
    </div>
  )
}
