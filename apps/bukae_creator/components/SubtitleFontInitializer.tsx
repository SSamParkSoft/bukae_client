'use client'

import { useEffect } from 'react'
import { initializeSubtitleFonts } from '@/lib/subtitle-fonts'

/**
 * Supabase Storage에서 자막 폰트를 초기화하는 클라이언트 컴포넌트
 */
export default function SubtitleFontInitializer() {
  useEffect(() => {
    initializeSubtitleFonts()
  }, [])

  return null
}

