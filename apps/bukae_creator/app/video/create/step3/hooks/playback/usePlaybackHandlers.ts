'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UsePlaybackHandlersParams {
  timelineRef: React.MutableRefObject<TimelineData | null>
  voiceTemplateRef: React.MutableRefObject<string | null>
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void | Promise<void>
  setShowVoiceRequiredMessage: (show: boolean) => void
  setScenesWithoutVoice: (scenes: number[]) => void
  setRightPanelTab: (tab: string) => void
  router: ReturnType<typeof useRouter>
}

/**
 * 재생 관련 핸들러 훅
 * 전체 재생, 그룹 재생, 씬 재생 핸들러를 제공합니다.
 */
export function usePlaybackHandlers({
  timelineRef,
  voiceTemplateRef,
  isPlaying,
  setIsPlaying,
  setShowVoiceRequiredMessage,
  setScenesWithoutVoice,
  setRightPanelTab,
  router,
}: UsePlaybackHandlersParams) {
  // 재생/일시정지 핸들러 (Transport 기반)
  const handlePlayPause = useCallback(() => {
    const currentIsPlaying = isPlaying
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    if (currentIsPlaying) {
      // 일시정지
      setIsPlaying(false)
      setShowVoiceRequiredMessage(false)
    } else {
      // 재생 시작 전 음성 선택 여부 확인
      if (!currentTimeline) {
        return
      }
      
      const scenesWithoutVoice: number[] = []
      for (let i = 0; i < currentTimeline.scenes.length; i++) {
        const scene = currentTimeline.scenes[i]
        
        // 씬별 voiceTemplate이 있으면 사용, 없으면 전역 voiceTemplate 사용
        const hasSceneVoiceTemplate = scene?.voiceTemplate != null && 
                                      typeof scene.voiceTemplate === 'string' && 
                                      scene.voiceTemplate.trim() !== ''
        const sceneVoiceTemplate = hasSceneVoiceTemplate 
          ? scene.voiceTemplate 
          : currentVoiceTemplate
        
        const isEmpty = sceneVoiceTemplate == null || 
                       sceneVoiceTemplate === '' ||
                       (typeof sceneVoiceTemplate === 'string' && sceneVoiceTemplate.trim() === '')
        
        if (isEmpty) {
          scenesWithoutVoice.push(i + 1) // 사용자에게 보여줄 때는 1부터 시작
        }
      }
      
      if (scenesWithoutVoice.length > 0) {
        setScenesWithoutVoice(scenesWithoutVoice)
        setShowVoiceRequiredMessage(true)
        // 음성 탭으로 자동 이동
        setRightPanelTab('voice')
        // 3초 후 자동으로 숨김
        setTimeout(() => {
          setShowVoiceRequiredMessage(false)
          setScenesWithoutVoice([])
        }, 3000)
        return
      }
      
      // 모든 씬에 음성이 있으면 재생 시작
      setShowVoiceRequiredMessage(false)
      void setIsPlaying(true)
    }
  }, [isPlaying, setIsPlaying, setRightPanelTab, setShowVoiceRequiredMessage, setScenesWithoutVoice, timelineRef, voiceTemplateRef])

  // 그룹 재생 핸들러 (TODO: Transport 기반으로 재구현 필요)
  // 현재는 전체 재생과 동일하게 처리 (Transport는 전체 타임라인을 재생)
  const handleGroupPlay = useCallback(async (sceneId: number, groupIndices: number[]) => {
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    if (!currentTimeline) return
    
    // 대상 그룹에 대한 음성 템플릿 존재 여부 확인 (씬별 voiceTemplate 우선, 없으면 전역 voiceTemplate)
    const hasVoiceForGroup = groupIndices.every((idx) => {
      const sceneVoice = currentTimeline.scenes[idx]?.voiceTemplate
      const resolvedVoice = sceneVoice || currentVoiceTemplate
      return !!resolvedVoice && resolvedVoice.trim() !== ''
    })

    if (!hasVoiceForGroup) {
      setShowVoiceRequiredMessage(true)
      // 음성 탭으로 자동 이동
      setRightPanelTab('voice')
      // 3초 후 자동으로 숨김
      setTimeout(() => {
        setShowVoiceRequiredMessage(false)
      }, 3000)
      return
    }
    
    // TODO: 그룹 재생은 Transport 기반으로 재구현 필요
    // 현재는 전체 재생과 동일하게 처리
    setShowVoiceRequiredMessage(false)
    void setIsPlaying(true)
  }, [setIsPlaying, setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef])

  // 씬 재생 핸들러 (TODO: Transport 기반으로 재구현 필요 - 특정 씬부터 재생)
  // 현재는 전체 재생과 동일하게 처리
  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    try {
      if (!currentTimeline) return
      
      // 음성 선택 여부 확인 (null, undefined, 빈 문자열 모두 체크)
      const sceneVoice = currentTimeline.scenes[sceneIndex]?.voiceTemplate || currentVoiceTemplate
      if (!sceneVoice || sceneVoice.trim() === '') {
        setShowVoiceRequiredMessage(true)
        // 음성 탭으로 자동 이동
        setRightPanelTab('voice')
        // 3초 후 자동으로 숨김
        setTimeout(() => {
          setShowVoiceRequiredMessage(false)
        }, 3000)
        return
      }
      
      // TODO: 특정 씬부터 재생하는 기능은 Transport 기반으로 재구현 필요
      // 현재는 전체 재생과 동일하게 처리
      setShowVoiceRequiredMessage(false)
      void setIsPlaying(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // 인증 오류인 경우 처리
      if (errorMessage.includes('인증') || 
          errorMessage.includes('로그인') ||
          errorMessage.includes('유효하지 않습니다')) {
        // 토큰 정리
        if (typeof window !== 'undefined') {
          const { authStorage } = await import('@/lib/api/auth-storage')
          authStorage.clearTokens()
          
          // 인증 만료 이벤트 발생 (providers.tsx에서 로그인 페이지로 리다이렉트)
          window.dispatchEvent(new CustomEvent('auth:expired'))
          
          // UI에 에러 메시지 표시
          alert('인증 시간이 만료되었어요.\n다시 로그인해주세요.')
          
          // 로그인 페이지로 리다이렉트
          router.replace('/login')
        }
        return
      }
      
      // 기타 오류는 콘솔에만 출력
      console.error('[씬 재생] 오류:', error)
    }
  }, [setIsPlaying, router, setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef])

  return {
    handlePlayPause,
    handleGroupPlay,
    handleScenePlay,
  }
}
