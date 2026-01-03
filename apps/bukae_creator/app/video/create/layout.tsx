'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useVideoCreateStore } from '@/store/useVideoCreateStore'

export default function VideoCreateLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const navigationBlockedRef = useRef(false)
  const prevPathnameRef = useRef<string | null>(null)
  const routerRef = useRef(router)
  
  // router ref 업데이트
  useEffect(() => {
    routerRef.current = router
  }, [router])
  
  const { 
    autoSaveEnabled, 
    setAutoSaveEnabled, 
    hasUnsavedChanges,
    setHasUnsavedChanges 
  } = useVideoCreateStore()
  
  // setter 함수들을 ref로 저장하여 dependency array 크기 일정하게 유지
  const setAutoSaveEnabledRef = useRef(setAutoSaveEnabled)
  const setHasUnsavedChangesRef = useRef(setHasUnsavedChanges)
  
  useEffect(() => {
    setAutoSaveEnabledRef.current = setAutoSaveEnabled
    setHasUnsavedChangesRef.current = setHasUnsavedChanges
  }, [setAutoSaveEnabled, setHasUnsavedChanges])
  
  // 영상 제작 페이지인지 확인
  const isVideoCreatePage = pathname?.startsWith('/video/create') ?? false
  
  // 영상 제작 페이지 내에서는 항상 저장 활성화
  useEffect(() => {
    if (isVideoCreatePage) {
      setAutoSaveEnabledRef.current(true)
    }
  }, [isVideoCreatePage])
  
  // 브라우저 이탈 감지 (beforeunload)
  useEffect(() => {
    if (!isVideoCreatePage) return
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && autoSaveEnabled) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isVideoCreatePage, hasUnsavedChanges, autoSaveEnabled])
  
  // 전역 클릭 이벤트 감지 (Link 클릭 가로채기)
  useEffect(() => {
    if (!isVideoCreatePage) return

    const handleClick = (e: MouseEvent) => {
      // 저장되지 않은 변경사항이 없으면 통과
      if (!hasUnsavedChanges || !autoSaveEnabled) return
      
      // Link 요소 찾기
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      if (!link) return
      
      const href = link.getAttribute('href')
      if (!href) return
      
      // 같은 페이지 내 링크는 무시
      if (href.startsWith('#')) return
      
      // 영상 제작 페이지 내부 링크는 무시
      if (href.startsWith('/video/create')) return
      
      // 외부 링크는 무시
      if (href.startsWith('http') || href.startsWith('//')) return
      
      // 영상 제작 페이지에서 다른 페이지로 이동하려는 경우
      e.preventDefault()
      e.stopPropagation()
      
      navigationBlockedRef.current = true
      setPendingNavigation(href)
      setShowSaveDialog(true)
    }

    document.addEventListener('click', handleClick, true) // capture phase에서 실행
    return () => document.removeEventListener('click', handleClick, true)
  }, [isVideoCreatePage, hasUnsavedChanges, autoSaveEnabled])

  // Next.js 라우터 변경 감지 (router.push 등으로 직접 이동하는 경우)
  useEffect(() => {
    const currentPath = pathname
    const prevPath = prevPathnameRef.current
    
    // 초기 마운트 시에는 이전 경로가 없으므로 스킵
    if (!prevPath) {
      prevPathnameRef.current = currentPath
      return
    }
    
    // 이미 다이얼로그가 표시 중이면 스킵
    if (navigationBlockedRef.current) {
      return
    }
    
    // 이전 경로가 영상 제작 페이지이고, 현재 경로가 영상 제작 페이지가 아닐 때
    const wasInVideoCreate = prevPath?.startsWith('/video/create')
    const isInVideoCreate = currentPath?.startsWith('/video/create')
    
    if (wasInVideoCreate && !isInVideoCreate) {
      // 저장되지 않은 변경사항이 있고, 저장이 활성화되어 있으면 확인 다이얼로그 표시
      if (hasUnsavedChanges && autoSaveEnabled) {
        navigationBlockedRef.current = true
        setPendingNavigation(currentPath)
        setShowSaveDialog(true)
        // 라우터 변경을 막기 위해 이전 경로로 되돌림
        window.history.pushState(null, '', prevPath)
        return
      }
    }
    
    // 정상적인 네비게이션이면 이전 경로 업데이트
    if (!navigationBlockedRef.current) {
      prevPathnameRef.current = currentPath
    }
  }, [pathname, hasUnsavedChanges, autoSaveEnabled])
  
  const handleSave = () => {
    setAutoSaveEnabledRef.current(true)
    setShowSaveDialog(false)
    navigationBlockedRef.current = false
    
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }
  
  const handleDontSave = () => {
    setAutoSaveEnabledRef.current(false)
    setHasUnsavedChangesRef.current(false)
    setShowSaveDialog(false)
    navigationBlockedRef.current = false
    
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }
  
  const handleCancel = () => {
    setShowSaveDialog(false)
    navigationBlockedRef.current = false
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>임시 저장하시겠습니까?</DialogTitle>
            <DialogDescription>
              현재 작업 내용을 임시 저장하지 않으면 다음에 돌아왔을 때 복원되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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

