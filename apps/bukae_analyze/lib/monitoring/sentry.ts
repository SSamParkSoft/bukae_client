import * as Sentry from '@sentry/nextjs'

export type SentryFlow =
  | 'auth'
  | 'oauth_callback'
  | 'intake'
  | 'planning'
  | 'planning_message'
  | 'planning_workspace'
  | 'analysis'
  | 'generation'
  | 'shooting_guide'
  | 'api_proxy'
  | 'unknown'

export type SentryErrorKind =
  | 'api_error'
  | 'auth_error'
  | 'network_error'
  | 'validation_error'
  | 'unexpected_error'

export type CaptureAppErrorOptions = {
  flow: SentryFlow
  operation: string
  errorKind?: SentryErrorKind
  level?: Sentry.SeverityLevel
  tags?: Record<string, string | number | boolean | null | undefined>
  context?: Record<string, unknown>
}

function getErrorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === 'object'
    ? error as Record<string, unknown>
    : null
}

export function getErrorStatus(error: unknown): number | undefined {
  const record = getErrorRecord(error)
  const status = record?.status

  return typeof status === 'number' ? status : undefined
}

export function classifyApiError(error: unknown): SentryErrorKind {
  const status = getErrorStatus(error)
  if (status) return status === 401 || status === 403 ? 'auth_error' : 'api_error'
  if (error instanceof TypeError) return 'network_error'

  const name = getErrorRecord(error)?.name
  if (typeof name === 'string' && name.toLowerCase().includes('zod')) {
    return 'validation_error'
  }

  return 'unexpected_error'
}

export function captureAppError(
  error: unknown,
  {
    flow,
    operation,
    errorKind = 'unexpected_error',
    level = 'error',
    tags,
    context,
  }: CaptureAppErrorOptions,
) {
  Sentry.withScope((scope) => {
    scope.setLevel(level)
    scope.setTag('flow', flow)
    scope.setTag('operation', operation)
    scope.setTag('error_kind', errorKind)

    Object.entries(tags ?? {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return
      scope.setTag(key, String(value))
    })

    if (context) {
      scope.setContext('app', context)
    }

    Sentry.captureException(error)
  })
}
