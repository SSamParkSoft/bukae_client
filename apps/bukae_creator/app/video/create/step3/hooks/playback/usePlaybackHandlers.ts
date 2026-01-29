'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { getSceneStartTime } from '@/utils/timeline'

interface UsePlaybackHandlersParams {
  timelineRef: React.MutableRefObject<TimelineData | null>
  voiceTemplateRef: React.MutableRefObject<string | null>
  isPlaying: boolean
  setIsPlaying: (playing: boolean, options?: { sceneIndex?: number | null; groupSceneId?: number | null; startFromSceneIndex?: number }) => void | Promise<void>
  setCurrentTime: (time: number) => void
  setShowVoiceRequiredMessage: (show: boolean) => void
  setScenesWithoutVoice: (scenes: number[]) => void
  setRightPanelTab: (tab: string) => void
  router: ReturnType<typeof useRouter>
  onGroupPlayStart?: (sceneId: number, endTime: number) => void
  onScenePlayStart?: (sceneIndex: number, endTime: number) => void
  onFullPlayStart?: () => void
  playingSceneIndex: number | null
  playingGroupSceneId: number | null
  /** 전체 재생 시 이 씬의 세그먼트 시작 시점부터 재생 (선택된 씬이 있을 때) */
  currentSceneIndex: number
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
  setCurrentTime,
  setShowVoiceRequiredMessage,
  setScenesWithoutVoice,
  setRightPanelTab,
  router,
  onGroupPlayStart,
  onScenePlayStart,
  playingSceneIndex,
  playingGroupSceneId,
  currentSceneIndex,
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
      
      // 모든 씬에 음성이 있으면 재생 시작 (전체 재생). 선택된 씬이 있으면 해당 씬 세그먼트 시작부터 재생
      setShowVoiceRequiredMessage(false)
      void setIsPlaying(true, {
        startFromSceneIndex: currentSceneIndex >= 0 ? currentSceneIndex : undefined,
      })
    }
  }, [isPlaying, setIsPlaying, setRightPanelTab, setShowVoiceRequiredMessage, setScenesWithoutVoice, timelineRef, voiceTemplateRef, currentSceneIndex])

  // 그룹 재생 핸들러 (Transport 기반)
  const handleGroupPlay = useCallback(async (sceneId: number, groupIndices: number[]) => {
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    if (!currentTimeline) return
    
    // 이미 해당 그룹이 재생 중이면 정지
    if (isPlaying && playingGroupSceneId === sceneId) {
      void setIsPlaying(false)
      setShowVoiceRequiredMessage(false)
      return
    }
    
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
    
    // 그룹의 첫 번째 씬의 시작 시간 계산
    const firstSceneIndex = groupIndices[0]
    if (firstSceneIndex === undefined || firstSceneIndex < 0 || firstSceneIndex >= currentTimeline.scenes.length) {
      return
    }
    
    const startTime = getSceneStartTime(currentTimeline, firstSceneIndex)
    
    // 그룹의 마지막 씬의 종료 시간 계산
    const lastSceneIndex = groupIndices[groupIndices.length - 1]
    if (lastSceneIndex === undefined || lastSceneIndex < 0 || lastSceneIndex >= currentTimeline.scenes.length) {
      return
    }
    
    const lastScene = currentTimeline.scenes[lastSceneIndex]
    const lastSceneStartTime = getSceneStartTime(currentTimeline, lastSceneIndex)
    const endTime = lastSceneStartTime + lastScene.duration
    
    // 재생 시작 (그룹 재생 정보 전달)
    // setCurrentTime은 setIsPlaying 내부에서 처리하므로 여기서는 호출하지 않음
    setShowVoiceRequiredMessage(false)
    void setIsPlaying(true, { groupSceneId: sceneId })
    
    // 그룹 재생 시작 콜백 호출 (종료 시간 포함)
    if (onGroupPlayStart) {
      onGroupPlayStart(sceneId, endTime)
    }
  }, [setIsPlaying, setCurrentTime, setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef, onGroupPlayStart, isPlaying, playingGroupSceneId])

  // 씬 재생 핸들러 (Transport 기반 - 특정 씬부터 재생)
  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    try {
      if (!currentTimeline) return
      
      if (sceneIndex < 0 || sceneIndex >= currentTimeline.scenes.length) {
        return
      }
      
      // 이미 해당 씬이 재생 중이면 정지
      if (isPlaying && playingSceneIndex === sceneIndex) {
        void setIsPlaying(false)
        setShowVoiceRequiredMessage(false)
        return
      }
      
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
      
      // 씬의 시작 시간 계산
      const startTime = getSceneStartTime(currentTimeline, sceneIndex)
      
      // 씬의 종료 시간 계산
      const scene = currentTimeline.scenes[sceneIndex]
      const endTime = startTime + scene.duration
      
      // 재생 시작 (씬 재생 정보 전달)
      // setCurrentTime은 setIsPlaying 내부에서 처리하므로 여기서는 호출하지 않음
      setShowVoiceRequiredMessage(false)
      void setIsPlaying(true, { sceneIndex })
      
      // 씬 재생 시작 콜백 호출 (종료 시간 포함)
      if (onScenePlayStart) {
        onScenePlayStart(sceneIndex, endTime)
      }
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
  }, [setIsPlaying, setCurrentTime, router, setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef, onScenePlayStart, isPlaying, playingSceneIndex])

  return {
    handlePlayPause,
    handleGroupPlay,
    handleScenePlay,
  }
}
