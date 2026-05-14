export interface FeedbackFormConfig {
  formUrl?: string
  currentPageEntryId?: string
  projectIdEntryId?: string
  userNameEntryId?: string
  userEmailEntryId?: string
}

export interface FeedbackContext {
  pathname: string
  search?: string
  projectId?: string | null
  userName?: string | null
  userEmail?: string | null
}

function normalizeGoogleFormEntryId(entryId: string): string {
  return entryId.startsWith('entry.') ? entryId : `entry.${entryId}`
}

function setParamIfPresent(
  searchParams: URLSearchParams,
  key: string | undefined,
  value: string | null | undefined
) {
  if (!key || !value) return

  const trimmed = value.trim()
  if (!trimmed) return

  searchParams.set(key, trimmed)
}

function setGoogleFormEntryIfPresent(
  searchParams: URLSearchParams,
  entryId: string | undefined,
  value: string | null | undefined
) {
  if (!entryId) return

  setParamIfPresent(searchParams, normalizeGoogleFormEntryId(entryId), value)
}

function buildCurrentPage({ pathname, search = '' }: FeedbackContext): string {
  if (!search) return pathname
  return search.startsWith('?') ? `${pathname}${search}` : `${pathname}?${search}`
}

export function buildFeedbackUrl(
  config: FeedbackFormConfig,
  context: FeedbackContext
): string | null {
  const formUrl = config.formUrl?.trim()
  if (!formUrl) return null

  let url: URL

  try {
    url = new URL(formUrl)
  } catch {
    return null
  }

  const currentPage = buildCurrentPage(context)

  setParamIfPresent(url.searchParams, 'currentPage', currentPage)
  setParamIfPresent(url.searchParams, 'projectId', context.projectId)
  setParamIfPresent(url.searchParams, 'userName', context.userName)
  setParamIfPresent(url.searchParams, 'userEmail', context.userEmail)

  setGoogleFormEntryIfPresent(
    url.searchParams,
    config.currentPageEntryId,
    currentPage
  )
  setGoogleFormEntryIfPresent(
    url.searchParams,
    config.projectIdEntryId,
    context.projectId
  )
  setGoogleFormEntryIfPresent(
    url.searchParams,
    config.userNameEntryId,
    context.userName
  )
  setGoogleFormEntryIfPresent(
    url.searchParams,
    config.userEmailEntryId,
    context.userEmail
  )

  return url.toString()
}
