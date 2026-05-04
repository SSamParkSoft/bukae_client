import './globals.css'
import { CinematicBackground } from '@/app/_components/CinematicBackground'
import { QueryProvider } from '@/app/_components/QueryProvider'

export const metadata = {
  title: 'Bukae, 당신에게 딱 맞는 부캐',
  description: 'AI 기반 숏폼 영상 분석 및 맞춤형 촬영가이드 제작 서비스',
  icons: {
    icon: [
      {
        url: '/bukae_favicon_dark.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/bukae_favicon_light.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head />
      <body>
        <CinematicBackground />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
