import './globals.css'
import { CinematicBackground } from '@/app/_components/CinematicBackground'
import { QueryProvider } from '@/app/_components/QueryProvider'

export const metadata = {
  title: 'Bukae Analyze',
  description: '부캐 분석 플랫폼',
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
