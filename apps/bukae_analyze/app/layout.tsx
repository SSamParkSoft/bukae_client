import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

export const metadata = {
  title: 'Bukae Analyze',
  description: '부캐 분석 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preload" as="image" href="/bukae_space.webp" fetchPriority="high" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
