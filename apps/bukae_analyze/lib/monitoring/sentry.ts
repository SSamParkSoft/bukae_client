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
