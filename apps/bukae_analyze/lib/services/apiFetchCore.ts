export type ApiFetcher = (
  url: string,
  options?: RequestInit
) => Promise<Response>

export async function apiFetchWithToken(
  token: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Authorization', `Bearer ${token}`)

  return fetch(url, { ...options, headers })
}
