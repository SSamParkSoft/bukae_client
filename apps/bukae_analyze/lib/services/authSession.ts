import type { CurrentUser } from './auth'

async function throwIfNotOk(res: Response, label: string): Promise<void> {
  if (res.ok) return

  const body = await res.text().catch(() => '')
  throw new Error(`${label} (${res.status})${body ? `: ${body}` : ''}`)
}

export async function syncServerAccessToken(accessToken: string): Promise<CurrentUser> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken }),
  })

  await throwIfNotOk(res, '서버 세션 동기화 실패')
  const { user } = await res.json() as { user: CurrentUser }
  return user
}

export async function clearServerAccessToken(): Promise<void> {
  const res = await fetch('/api/auth/session', {
    method: 'DELETE',
  })

  await throwIfNotOk(res, '서버 세션 정리 실패')
}
