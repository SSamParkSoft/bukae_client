'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // 루트 경로는 제작 페이지(step0)로 리다이렉트
    router.replace('/video/create')
  }, [router])

  return null
}
