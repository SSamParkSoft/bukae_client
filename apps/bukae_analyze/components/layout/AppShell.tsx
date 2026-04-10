import { Header } from './Header'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-white text-black">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <RightSidebar />
      </div>
    </div>
  )
}
