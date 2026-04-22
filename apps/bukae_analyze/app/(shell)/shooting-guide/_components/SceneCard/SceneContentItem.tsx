interface SceneContentItemProps {
  title: string
  content: string
}

export function SceneContentItem({ title, content }: SceneContentItemProps) {
  return (
    <div className="space-y-2">
      <p className="tracking-[-0.04em] text-white/60" style={{ fontSize: 'clamp(16px, 1.04vw, 20px)' }}>{title}</p>
      <p className="tracking-[-0.04em] leading-[1.6] text-white" style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}>{content}</p>
    </div>
  )
}
