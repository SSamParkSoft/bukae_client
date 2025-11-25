import './globals.css'
import Providers from './providers'
import AppShell from '../components/AppShell'
import ThemeInitializer from '../components/ThemeInitializer'

export const metadata = {
  title: 'Bukae Dashboard',
  description: 'AI 기반 부업 자동화 서비스 대시보드',
  icons: {
    icon: '/logo-icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="transition-colors">
        <ThemeInitializer />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}