import '../globals.css'
import Providers from '../providers'
import ThemeInitializer from '../../components/ThemeInitializer'
import ThemeToggle from '../../components/ThemeToggle'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeInitializer />
      <Providers>
        {children}
        <ThemeToggle />
      </Providers>
    </>
  )
}

