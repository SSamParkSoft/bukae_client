'use client'

import { useEffect, useState } from 'react'
import { useVideoCreateStore } from './useVideoCreateStore'

export function useVideoCreateStoreHydration(): boolean {
  // 초기값은 항상 false: 서버와 클라이언트 첫 렌더가 일치해야 hydration 에러를 방지함.
  // hasHydrated()를 초기값으로 쓰면 클라이언트에서 이미 persist 완료 상태일 때
  // 서버(false)와 클라이언트(true)가 달라 mismatch가 발생한다.
  const [isHydrated, setIsHydrated] = useState<boolean>(false)

  useEffect(() => {
    const persist = useVideoCreateStore.persist

    // 마운트 시점에 이미 hydrate된 경우 즉시 반영
    if (persist.hasHydrated()) {
      setIsHydrated(true)
    }

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
