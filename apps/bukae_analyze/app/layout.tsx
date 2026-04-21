import './globals.css'
import { CinematicBackground } from '@/app/_components/CinematicBackground'

export const metadata = {
  title: 'Bukae Analyze',
  description: '부캐 분석 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head />
      <body>
        <CinematicBackground />
        {children}
      </body>
    </html>
  )
}
