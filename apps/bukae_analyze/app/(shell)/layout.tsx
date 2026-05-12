import { redirect } from 'next/navigation'
import { AppShell } from './_components/AppShell'
import { getServerCurrentUser } from '@/lib/server/authSession'

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getServerCurrentUser()

  if (!initialUser) {
    redirect('/login')
  }

  return (
    <AppShell isAuthenticated initialUser={initialUser}>{children}</AppShell>
  )
}
