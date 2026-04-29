import type { CurrentUser } from '@/lib/services/auth'
import { Header } from './Header'
import { AnalyzeWorkflowProgressSidebar } from '../workflow/AnalyzeWorkflowProgressSidebar'
import { AnalyzeWorkflowNextStepSidebar } from '../workflow/AnalyzeWorkflowNextStepSidebar'

export function AppShell({
  children,
  isAuthenticated = false,
  initialUser = null,
}: {
  children: React.ReactNode
  isAuthenticated?: boolean
  initialUser?: CurrentUser | null
}) {
  return (
    <div className="h-screen overflow-hidden flex flex-col text-foreground">
      <Header isAuthenticated={isAuthenticated} initialUser={initialUser} />
      <div className="flex flex-1 overflow-hidden">
        <AnalyzeWorkflowProgressSidebar />
        <div className="relative flex-1 min-w-0 min-h-0">
          <main className="flex h-full flex-col overflow-x-hidden overflow-y-auto scrollbar-hide">
            {children}
          </main>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-brand to-transparent" />
        </div>
        <AnalyzeWorkflowNextStepSidebar />
      </div>
    </div>
  )
}
