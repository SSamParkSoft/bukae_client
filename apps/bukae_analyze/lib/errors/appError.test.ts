import { describe, expect, it } from 'vitest'
import { resolveAppError } from './appError'
import { ServiceResponseError } from '@/lib/services/apiError'

describe('resolveAppError', () => {
  it('maps 401 to auth_expired', () => {
    const error = resolveAppError(new ServiceResponseError('인증 실패', 401), 'planning_session_fetch')

    expect(error.kind).toBe('auth_expired')
    expect(error.status).toBe(401)
  })

  it('maps 403 to forbidden', () => {
    const error = resolveAppError(new ServiceResponseError('권한 없음', 403), 'generation_bootstrap')

    expect(error.kind).toBe('forbidden')
  })

  it('uses context copy for planning setup bad requests', () => {
    const error = resolveAppError(
      new ServiceResponseError('기획 프리세팅 제출 실패', 400),
      'planning_setup_submit'
    )

    expect(error.kind).toBe('invalid_project_state')
    expect(error.title).toBe('기획 프리세팅을 제출할 수 없습니다')
  })

  it('maps server errors to server_error', () => {
    const error = resolveAppError(new ServiceResponseError('서버 실패', 503), 'generation_start')

    expect(error.kind).toBe('server_error')
  })

  it('maps fetch type errors to network_error', () => {
    const error = resolveAppError(new TypeError('fetch failed'), 'analysis_polling')

    expect(error.kind).toBe('network_error')
  })

  it('keeps string-form status fallback for legacy service errors', () => {
    const error = resolveAppError(new Error('기획 세션 조회 실패 (404)'), 'planning_session_fetch')

    expect(error.kind).toBe('invalid_project_state')
    expect(error.status).toBe(404)
  })
})
