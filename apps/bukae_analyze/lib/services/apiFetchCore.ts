export type ApiFetcher = (
  url: string,
  options?: RequestInit
) => Promise<Response>

function resolveRequestUrl(url: string): string {
  if (typeof window !== 'undefined' || !url.startsWith('/')) {
    return url
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiBaseUrl) {
    return url
  }

  return new URL(url, apiBaseUrl).toString()
}

export async function apiFetchWithToken(
  token: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Authorization', `Bearer ${token}`)

  return fetch(resolveRequestUrl(url), { ...options, headers })
}
