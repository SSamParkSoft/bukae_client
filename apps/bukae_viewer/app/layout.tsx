import './globals.css'
import Providers from './providers'

export const metadata = {
  title: 'Bookae Viewer',
  description: '부캐 영상 시청 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

