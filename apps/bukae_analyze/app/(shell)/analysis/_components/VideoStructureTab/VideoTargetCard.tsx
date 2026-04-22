interface Props {
  description: string
  attributes: string[]
}

export function VideoTargetCard({ description, attributes }: Props) {
  return (
    <div className="backdrop-blur-[2px] flex flex-col items-start px-6 w-full">
      <div className="flex flex-col items-start w-full">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          핵심 타겟층
        </p>
        <div className="flex flex-col px-6 py-4 w-full">
          <p className="mb-4 whitespace-pre-line font-medium leading-[1.4] tracking-[-0.04em] text-white/80 font-16-rg">
            {description}
          </p>
          <div className="flex gap-4 items-center flex-wrap">
            {attributes.map((attr) => (
              <span
                key={attr}
                className="bg-white/10 backdrop-glass-strong rounded-full font-medium tracking-[-0.04em] text-white"
                style={{ fontSize: 'clamp(14px, 0.9vw, 16px)', paddingLeft: 'clamp(10px, 0.9vw, 16px)', paddingRight: 'clamp(10px, 0.9vw, 16px)', paddingTop: 'clamp(4px, 0.42vw, 8px)', paddingBottom: 'clamp(4px, 0.42vw, 8px)' }}
              >
                {attr}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
