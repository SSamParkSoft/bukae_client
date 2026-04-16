interface PageTitleProps {
  title: string
  description: string
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <section className="mb-10">
      <h1 className="font-28-md tracking-tight mb-2">{title}</h1>
      <p className="font-16-md text-white/60 leading-relaxed">{description}</p>
    </section>
  )
}
