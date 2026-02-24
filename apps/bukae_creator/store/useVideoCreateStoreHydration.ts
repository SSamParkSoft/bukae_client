'use client'

import { useEffect, useState } from 'react'
import { useVideoCreateStore } from './useVideoCreateStore'

export function useVideoCreateStoreHydration(): boolean {
  const [isHydrated, setIsHydrated] = useState<boolean>(() => useVideoCreateStore.persist.hasHydrated())

  useEffect(() => {
    const persist = useVideoCreateStore.persist

    const unsubscribeHydrate = persist.onHydrate(() => {
      setIsHydrated(false)
    })

    const unsubscribeFinishHydration = persist.onFinishHydration(() => {
      setIsHydrated(true)
    })

    return () => {
      unsubscribeHydrate()
      unsubscribeFinishHydration()
    }
  }, [])

  return isHydrated
}
