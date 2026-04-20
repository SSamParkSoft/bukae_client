interface Props {
  description: string
  attributes: string[]
}

export function VideoTargetCard({ description, attributes }: Props) {
  return (
    <div className="backdrop-blur-[2px] bg-white/10 flex flex-col items-start px-6 py-8 w-full">
      <div className="flex flex-col gap-4 items-start w-full">
        <p className="font-medium tracking-[-0.04em] leading-[1.4] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>
          핵심 타겟층
        </p>
        <div className="flex flex-col gap-4 px-6 py-4 rounded-lg w-full">
          <p className="font-medium tracking-[-0.04em] text-white/80 leading-[1.4]" style={{ fontSize: 'clamp(16px, 1.17vw, 20px)' }}>
            {description}
          </p>
          <div className="flex gap-4 items-center flex-wrap">
            {attributes.map((attr) => (
              <span
                key={attr}
                className="bg-white/10 backdrop-glass-strong rounded-full font-medium tracking-[-0.04em] text-white"
                style={{ fontSize: 'clamp(12px, 0.83vw, 16px)', paddingLeft: 'clamp(8px, 0.83vw, 16px)', paddingRight: 'clamp(8px, 0.83vw, 16px)', paddingTop: 'clamp(4px, 0.42vw, 8px)', paddingBottom: 'clamp(4px, 0.42vw, 8px)' }}
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
