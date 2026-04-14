'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function useUrlInput() {
  const router = useRouter()
  const [url, setUrl] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    router.push('/analysis')
  }

  return { url, handleChange, handleSubmit }
}
