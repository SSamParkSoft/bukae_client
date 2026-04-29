import 'server-only'

import { apiFetchWithToken } from '@/lib/services/apiFetchCore'
import type { ApiFetcher } from '@/lib/services/apiFetchCore'

export function createServerApiFetcher(accessToken: string): ApiFetcher {
  return (url, options = {}) => apiFetchWithToken(accessToken, url, options)
}
