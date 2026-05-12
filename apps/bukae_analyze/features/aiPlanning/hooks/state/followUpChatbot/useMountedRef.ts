'use client'

import { useEffect, useRef } from 'react'
import type { RefState } from './planningEffectTypes'

/** unmount 후 비동기 setState가 실행되지 않도록 마운트 여부를 ref로 추적한다. */
export function useMountedRef(): RefState<boolean> {
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef
}
