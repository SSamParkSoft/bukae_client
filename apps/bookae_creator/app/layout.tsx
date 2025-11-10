import './globals.css'
import Providers from './providers'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'Bookae Client',
  description: 'AI 기반 부업 자동화 서비스 클라이언트',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}