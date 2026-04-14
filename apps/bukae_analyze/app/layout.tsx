import './globals.css'
import { AppShell } from '@/components/layout/AppShell'

export const metadata = {
  title: 'Bukae Analyze',
  description: '부캐 분석 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
