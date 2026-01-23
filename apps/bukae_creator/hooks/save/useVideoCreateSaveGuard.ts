'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

/**
 * 영상 제작 페이지에서 변경사항 추적 및 저장 제어 훅
 * 각 step 페이지에서 사용하여 변경사항을 감지합니다.
 */
export function useVideoCreateSaveGuard() {
  const pathname = usePathname()
  const { setHasUnsavedChanges, setAutoSaveEnabled } = useVideoCreateStore()
  const isVideoCreatePage = pathname?.startsWith('/video/create') ?? false
  const prevPathnameRef = useRef<string | null>(null)
  
  // 영상 제작 페이지에 진입하면 저장 활성화
  useEffect(() => {
    if (isVideoCreatePage) {
      setAutoSaveEnabled(true)
    }
    
    prevPathnameRef.current = pathname
  }, [isVideoCreatePage, pathname, setAutoSaveEnabled])
  
  return {
    markAsChanged: () => setHasUnsavedChanges(true),
    markAsSaved: () => setHasUnsavedChanges(false),
  }
}

