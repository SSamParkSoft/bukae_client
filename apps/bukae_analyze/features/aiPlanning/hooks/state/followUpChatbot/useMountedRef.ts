'use client'

import { useEffect, useRef } from 'react'
import type { RefState } from './planningEffectTypes'

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
