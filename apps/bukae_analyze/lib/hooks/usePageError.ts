import { useState, useCallback } from 'react'

export interface PageError {
  message: string | null
  setError: (message: string) => void
  clearError: () => void
}

/**
 * 페이지 훅에서 API 에러를 관리하는 공통 훅.
 *
 * 사용법:
 * ```ts
 * const { message: errorMessage, setError, clearError } = usePageError()
 *
 * try {
 *   await someApiCall()
 * } catch (e) {
 *   setError(e instanceof Error ? e.message : '오류가 발생했습니다')
 * }
 * ```
 */
export function usePageError(): PageError {
  const [message, setMessage] = useState<string | null>(null)

  const setError = useCallback((msg: string) => {
    setMessage(msg)
  }, [])

  const clearError = useCallback(() => {
    setMessage(null)
  }, [])

  return { message, setError, clearError }
}
