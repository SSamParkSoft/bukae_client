interface PageTitleProps {
  title: string
  description: string
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <section className="mb-10">
      <h1 className="text-[clamp(20px,1.46vw,28px)] font-medium tracking-[-0.04em] leading-[1.4] text-white">{title}</h1>
      <p className="text-[clamp(12px,0.83vw,16px)] font-normal tracking-[-0.04em] leading-[1.4] text-white/60 mt-2">{description}</p>
    </section>
  )
}
