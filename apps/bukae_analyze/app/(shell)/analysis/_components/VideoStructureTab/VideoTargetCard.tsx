interface Props {
  description: string
  attributes: string[]
}

export function VideoTargetCard({ description, attributes }: Props) {
  return (
    <div className="backdrop-glass-soft flex flex-col items-start px-6 w-full">
      <div className="flex flex-col items-start w-full">
        <p className="font-fluid-20-md text-white/60">
          핵심 타겟층
        </p>
        <div className="flex flex-col px-6 py-4 w-full">
          <p className="mb-4 whitespace-pre-line font-16-rg text-white/80">
            {description}
          </p>
          <div className="flex gap-4 items-center flex-wrap">
            {attributes.map((attr) => (
              <span
                key={attr}
                className="bg-white/10 backdrop-glass-strong rounded-full font-fluid-16-md text-white px-4 py-2"
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
