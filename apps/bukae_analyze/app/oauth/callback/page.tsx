import { redirect } from 'next/navigation'
import { resolveSingleSearchParam } from '@/lib/utils/searchParams'

export default async function OAuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ accessToken?: string | string[] }>
}) {
  const { accessToken } = await searchParams
  const resolvedAccessToken = resolveSingleSearchParam(accessToken)

  if (!resolvedAccessToken) {
    redirect('/login')
  }

  redirect(`/api/auth/callback?accessToken=${encodeURIComponent(resolvedAccessToken)}`)
}
