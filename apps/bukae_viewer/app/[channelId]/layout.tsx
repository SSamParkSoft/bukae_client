import { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ channelId: string }>
}): Promise<Metadata> {
  const { channelId } = await params
  const title = `${channelId}_bookae`

  const metadata: Metadata = {
    title,
    description: `${channelId}의 미니홈페이지`,
  }

  if (channelId === 'ssambak' || channelId === '4rmy3px9') {
    metadata.verification = {
      google: 'X9h-6p24GJIq-mjk4cArLR3r3WMUDuX8jgWdbkpBClQ',
    }
  }

  return metadata
}

export default function ChannelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

