import './globals.css'

export const metadata = {
  title: 'Bukae Analyze',
  description: '부캐 분석 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  )
}
