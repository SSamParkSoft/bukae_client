import { Header } from './Header'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'
import { AnalysisLoadingOverlay } from './AnalysisLoadingOverlay'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden flex flex-col text-foreground">
      <Header />
      <AnalysisLoadingOverlay />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />
        <div className="relative flex-1 min-w-0 min-h-0">
          <main className="flex h-full flex-col overflow-x-hidden overflow-y-auto scrollbar-hide">
            {children}
          </main>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-brand to-transparent" />
        </div>
        <RightSidebar />
      </div>
    </div>
  )
}
