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

  // TODO(analyze-auth): 백엔드가 query accessToken 대신 서버 세션/인가 코드 플로우로 바뀌면
  // 이 redirect hop과 /oauth/finalize의 토큰 전달을 제거하고 서버에서 바로 세션을 확정한다.
  redirect(`/api/auth/callback?accessToken=${encodeURIComponent(resolvedAccessToken)}`)
}
