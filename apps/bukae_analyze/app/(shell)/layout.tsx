import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { getServerAccessToken, getServerCurrentUser } from '@/lib/server/authSession'

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const accessToken = await getServerAccessToken()

  if (!accessToken) {
    redirect('/login')
  }

  const initialUser = await getServerCurrentUser()

  return (
    <AppShell isAuthenticated initialUser={initialUser}>{children}</AppShell>
  )
}
