import '../globals.css'
import Providers from '../providers'
import ThemeInitializer from '../../components/ThemeInitializer'
import ThemeToggle from '../../components/ThemeToggle'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="transition-colors">
        <ThemeInitializer />
        <Providers>
          {children}
          <ThemeToggle />
        </Providers>
      </body>
    </html>
  )
}

