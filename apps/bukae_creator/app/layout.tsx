import './globals.css'
import Providers from './providers'
import AppShell from '../components/AppShell'
import ThemeInitializer from '../components/ThemeInitializer'
import SubtitleFontInitializer from '../components/SubtitleFontInitializer'

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
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.cdnfonts.com/css/zeroes"
        />
      </head>
      <body className="transition-colors">
        <ThemeInitializer />
        <SubtitleFontInitializer />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}