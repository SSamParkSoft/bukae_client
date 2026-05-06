export type AppErrorKind =
  | 'auth_expired'
  | 'forbidden'
  | 'invalid_project_state'
  | 'missing_result'
  | 'server_error'
  | 'network_error'
  | 'unknown'

export type AppErrorContext =
  | 'analysis_bootstrap'
  | 'analysis_polling'
  | 'planning_setup_submit'
  | 'planning_session_fetch'
  | 'pt1_answer_save'
  | 'generation_bootstrap'
  | 'generation_polling'
  | 'unknown'

export interface ResolvedAppError {
  kind: AppErrorKind
  context: AppErrorContext
  status: number | null
  title: string
  message: string
}

type AppErrorCopy = Pick<ResolvedAppError, 'kind' | 'title' | 'message'>

const DEFAULT_ERROR_COPY_BY_KIND: Record<AppErrorKind, Omit<AppErrorCopy, 'kind'>> = {
  auth_expired: {
    title: '로그인이 만료되었습니다',
    message: '다시 로그인한 뒤 진행 중이던 작업을 이어가 주세요.',
  },
  forbidden: {
    title: '접근할 수 없는 프로젝트입니다',
    message: '권한이 없거나 더 이상 접근할 수 없는 작업입니다.',
  },
  invalid_project_state: {
    title: '현재 프로젝트 상태로는 진행할 수 없습니다',
    message: '분석이 만료되었거나 이전 단계 정보가 부족합니다. 새로운 프로젝트로 다시 시작해주세요.',
  },
  missing_result: {
    title: '결과를 불러오지 못했습니다',
    message: '작업은 완료되었지만 화면에 표시할 결과 데이터가 없습니다.',
  },
  server_error: {
    title: '일시적인 서버 오류가 발생했습니다',
    message: '잠시 후 다시 시도해주세요. 문제가 반복되면 처음 화면에서 다시 시작해주세요.',
  },
  network_error: {
    title: '연결 상태를 확인해주세요',
    message: '네트워크 문제이거나 일시적인 오류일 수 있습니다. 잠시 후 다시 시도해주세요.',
  },
  unknown: {
    title: '요청을 처리하지 못했습니다',
    message: '예상하지 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
}

const BAD_REQUEST_ERROR_COPY_BY_CONTEXT: Partial<Record<AppErrorContext, AppErrorCopy>> = {
  // 400 사례를 발견하면 context를 추가해 사용자 복구 방향을 좁힌다.
  planning_setup_submit: {
    kind: 'invalid_project_state',
    title: '기획 프리세팅을 제출할 수 없습니다',
    message: '프로젝트 세션이 만료되었거나 이전 단계 정보가 부족합니다. 새로운 프로젝트로 다시 시작해주세요.',
  },
  generation_bootstrap: {
    kind: 'invalid_project_state',
    title: '촬영가이드를 불러올 수 없습니다',
    message: '생성 요청 정보가 만료되었거나 현재 프로젝트와 맞지 않습니다. 새로운 프로젝트로 다시 시작해주세요.',
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : ''
}

function getErrorStatus(error: unknown): number | null {
  if (isRecord(error) && typeof error.status === 'number') {
    return error.status
  }

  const message = getErrorMessage(error)
  const statusMatch =
    message.match(/\((?:HTTP\s*)?(\d{3})\)/i) ??
    message.match(/HTTP\s+(\d{3})/i) ??
    message.match(/"status"\s*:\s*(\d{3})/)

  if (!statusMatch?.[1]) return null

  const status = Number(statusMatch[1])
  return Number.isInteger(status) ? status : null
}

function isNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()

  return (
    error instanceof TypeError ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch failed')
  )
}

function createResolvedAppError(
  kind: AppErrorKind,
  context: AppErrorContext,
  status: number | null,
  copy: Omit<AppErrorCopy, 'kind'> = DEFAULT_ERROR_COPY_BY_KIND[kind]
): ResolvedAppError {
  return {
    kind,
    context,
    status,
    title: copy.title,
    message: copy.message,
  }
}

function resolveBadRequestError(
  context: AppErrorContext,
  status: number
): ResolvedAppError {
  const contextCopy = BAD_REQUEST_ERROR_COPY_BY_CONTEXT[context]

  if (contextCopy) {
    return createResolvedAppError(
      contextCopy.kind,
      context,
      status,
      contextCopy
    )
  }

  return createResolvedAppError('invalid_project_state', context, status)
}

export function resolveAppError(
  error: unknown,
  context: AppErrorContext = 'unknown'
): ResolvedAppError {
  const status = getErrorStatus(error)

  if (status === 401) {
    return createResolvedAppError('auth_expired', context, status)
  }

  if (status === 403) {
    return createResolvedAppError('forbidden', context, status)
  }

  if (status === 400 || status === 404 || status === 409) {
    return resolveBadRequestError(context, status)
  }

  if (status && status >= 500) {
    return createResolvedAppError('server_error', context, status)
  }

  if (isNetworkError(error)) {
    return createResolvedAppError('network_error', context, status)
  }

  return createResolvedAppError('unknown', context, status)
}

export function createAppError(
  kind: AppErrorKind,
  context: AppErrorContext = 'unknown',
  status: number | null = null
): ResolvedAppError {
  return createResolvedAppError(kind, context, status)
}
