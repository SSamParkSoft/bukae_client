'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'
import { clearVideoCreateDraft } from './_utils/draft-storage'

export default function VideoCreateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  
  const { 
    autoSaveEnabled, 
    setAutoSaveEnabled, 
    hasUnsavedChanges,
    setHasUnsavedChanges 
  } = useVideoCreateStore()
  
  const isVideoCreatePage = pathname?.startsWith('/video/create') ?? false
  
  // 영상 제작 페이지 내에서는 항상 저장 활성화
  useEffect(() => {
    if (isVideoCreatePage) {
      setAutoSaveEnabled(true)
    }
  }, [isVideoCreatePage, setAutoSaveEnabled])
  
  // 브라우저 이탈 감지 (프로덕션에서만)
  useEffect(() => {
    if (!isVideoCreatePage) return
    
    const isDev = process.env.NODE_ENV === 'development' || 
                  (typeof window !== 'undefined' && window.location.hostname === 'localhost')
    if (isDev) return
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && autoSaveEnabled) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isVideoCreatePage, hasUnsavedChanges, autoSaveEnabled])
  
  // 내부 네비게이션 링크 클릭 감지
  useEffect(() => {
    if (!isVideoCreatePage || !hasUnsavedChanges || !autoSaveEnabled) return

    const handleClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement
      if (!link) return
      
      const href = link.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('/video/create') || 
          href.startsWith('http') || href.startsWith('//')) return
      
      e.preventDefault()
      e.stopPropagation()
      setPendingNavigation(href)
      setShowSaveDialog(true)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [isVideoCreatePage, hasUnsavedChanges, autoSaveEnabled])
  
  const handleSave = () => {
    setAutoSaveEnabled(true)
    setShowSaveDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }
  
  const handleDontSave = () => {
    setAutoSaveEnabled(false)
    setHasUnsavedChanges(false)
    clearVideoCreateDraft()
    setShowSaveDialog(false)
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }
  
  const handleCancel = () => {
    setShowSaveDialog(false)
    setPendingNavigation(null)
  }
  
  return (
    <>
      {children}
      <Dialog open={showSaveDialog} onOpenChange={(open) => {
        if (!open) {
          handleCancel()
        }
      }}>
        <DialogContent 
          style={{ width: '100%', maxWidth: '448px' }}
        >
          <DialogHeader className="text-left" style={{ width: '100%' }}>
            <DialogTitle 
              style={{
                fontSize: '18px',
                lineHeight: '25.2px',
                fontWeight: '600',
                display: 'block',
                width: '100%',
                whiteSpace: 'normal',
                wordBreak: 'keep-all'
              }}
            >
              임시 저장하시겠습니까?
            </DialogTitle>
            <DialogDescription 
              style={{
                fontSize: '14px',
                lineHeight: '19.6px',
                display: 'block',
                width: '100%',
                whiteSpace: 'normal',
                wordBreak: 'keep-all'
              }}
            >
              현재 작업 내용을 임시 저장하지 않으면 다음에 돌아왔을 때 복원되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0" style={{ width: '100%' }}>
            <Button variant="outline" onClick={handleDontSave}>
              저장 안 함
            </Button>
            <Button onClick={handleSave}>
              임시 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
