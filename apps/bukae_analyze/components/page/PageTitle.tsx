interface PageTitleProps {
  title: string
  description: string
}

export function PageTitle({ title, description }: PageTitleProps) {
  return (
    <section className="mb-10">
      <h1 className="font-fluid-28-md text-white">{title}</h1>
      <p className="font-fluid-16-rg text-white/60 mt-2">{description}</p>
    </section>
  )
}
