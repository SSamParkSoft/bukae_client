interface PageTitleProps {
  title: string
  description: string | string[]
}

export function PageTitle({ title, description }: PageTitleProps) {
  const lines = Array.isArray(description) ? description : [description]

  return (
    <section className="mb-10">
      <h1 className="font-28-md tracking-tight mb-2">{title}</h1>
      <p className="font-16-sb text-white/60 leading-relaxed">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    </section>
  )
}
