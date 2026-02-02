'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProStep1Redirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/video/create/step1?track=pro')
  }, [router])

  return null
}
