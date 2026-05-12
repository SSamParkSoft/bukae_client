export function ChatAvatar({ icon }: { icon: React.ReactNode }) {
  return (
    <div
      className="shrink-0 rounded-full bg-white/4 backdrop-blur-[2px] flex items-center justify-center"
      style={{ width: 'clamp(44px, 3.125vw, 60px)', height: 'clamp(44px, 3.125vw, 60px)' }}
    >
      {icon}
    </div>
  )
}

export function ChatBubble({
  messages,
  variant,
}: {
  messages: string[]
  variant: 'user' | 'ai'
}) {
  const isUser = variant === 'user'
  return (
    <div
      className={[
        'flex flex-col py-4',
        isUser
          ? 'rounded-bl-[16px] rounded-br-[16px] rounded-tl-[16px] rounded-tr-[2px] bg-white/4 backdrop-blur-[5px] shadow-[0px_0px_4px_0px_rgba(255,255,255,0.1)] gap-4'
          : 'rounded-bl-[16px] rounded-br-[16px] rounded-tl-[2px] rounded-tr-[16px] gap-6',
      ].join(' ')}
      style={{ paddingLeft: 'clamp(16px, 1.67vw, 32px)', paddingRight: 'clamp(16px, 1.67vw, 32px)' }}
    >
      {messages.map((message, i) => (
        <p
          key={i}
          className={`font-normal tracking-[-0.04em] leading-[1.4] whitespace-pre-line ${isUser ? 'text-white' : 'text-white/80'}`}
          style={{ fontSize: 'clamp(14px, 0.9vw, 16px)' }}
        >
          {message}
        </p>
      ))}
    </div>
  )
}
