'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { TimelineData } from '@/store/useVideoCreateStore'

interface UsePlaybackHandlersParams {
  timelineRef: React.MutableRefObject<TimelineData | null>
  voiceTemplateRef: React.MutableRefObject<string | null>
  fullPlaybackRef: React.MutableRefObject<any>
  groupPlaybackRef: React.MutableRefObject<any>
  isPlaying: boolean
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
  fullPlaybackRef,
  groupPlaybackRef,
  isPlaying,
  setShowVoiceRequiredMessage,
  setScenesWithoutVoice,
  setRightPanelTab,
  router,
}: UsePlaybackHandlersParams) {
  // 재생/일시정지 핸들러
  const handlePlayPause = useCallback(() => {
    const currentIsPlaying = isPlaying
    const currentFullPlayback = fullPlaybackRef.current
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    if (currentIsPlaying) {
      currentFullPlayback?.stopAllScenes()
      setShowVoiceRequiredMessage(false)
    } else {
      // 모든 씬의 음성 선택 여부 확인
      if (!currentTimeline) {
        console.log('[handlePlayPause] timeline이 없습니다.')
        return
      }
      
      console.log('[handlePlayPause] 음성 선택 여부 확인 시작')
      console.log('[handlePlayPause] 전역 voiceTemplate:', currentVoiceTemplate)
      console.log('[handlePlayPause] 총 씬 개수:', currentTimeline.scenes.length)
      
      const scenesWithoutVoice: number[] = []
      for (let i = 0; i < currentTimeline.scenes.length; i++) {
        const scene = currentTimeline.scenes[i]
        const sceneVoiceTemplateRaw = scene?.voiceTemplate
        console.log(`[handlePlayPause] 씬 ${i + 1}:`, {
          sceneId: scene?.sceneId,
          sceneVoiceTemplate: sceneVoiceTemplateRaw,
          sceneVoiceTemplateType: typeof sceneVoiceTemplateRaw,
          sceneVoiceTemplateIsNull: sceneVoiceTemplateRaw === null,
          sceneVoiceTemplateIsUndefined: sceneVoiceTemplateRaw === undefined,
          sceneVoiceTemplateTrimmed: sceneVoiceTemplateRaw?.trim(),
          globalVoiceTemplate: currentVoiceTemplate,
        })
        
        // 씬별 voiceTemplate이 있으면 사용, 없으면(null/undefined/빈 문자열) 전역 voiceTemplate 사용
        // scene.voiceTemplate이 null, undefined, 빈 문자열이 아닌 경우에만 사용
        const hasSceneVoiceTemplate = scene?.voiceTemplate != null && 
                                      typeof scene.voiceTemplate === 'string' && 
                                      scene.voiceTemplate.trim() !== ''
        const sceneVoiceTemplate = hasSceneVoiceTemplate 
          ? scene.voiceTemplate 
          : currentVoiceTemplate
        
        console.log(`[handlePlayPause] 씬 ${i + 1} 최종 voiceTemplate:`, sceneVoiceTemplate)
        console.log(`[handlePlayPause] 씬 ${i + 1} hasSceneVoiceTemplate:`, hasSceneVoiceTemplate)
        
        // 최종적으로 voiceTemplate이 없으면 에러
        // sceneVoiceTemplate이 null이거나 빈 문자열이면 음성이 없는 것으로 판단
        // 하지만 sceneVoiceTemplate이 null이면 이미 voiceTemplate을 사용하도록 했으므로,
        // 실제로는 sceneVoiceTemplate이 null이 아니어야 함
        const isEmpty = sceneVoiceTemplate == null || 
                       sceneVoiceTemplate === '' ||
                       (typeof sceneVoiceTemplate === 'string' && sceneVoiceTemplate.trim() === '')
        console.log(`[handlePlayPause] 씬 ${i + 1} isEmpty:`, isEmpty, 'sceneVoiceTemplate:', sceneVoiceTemplate, 'type:', typeof sceneVoiceTemplate, 'length:', sceneVoiceTemplate?.length)
        
        if (isEmpty) {
          console.log(`[handlePlayPause] 씬 ${i + 1}에 음성이 없습니다.`)
          scenesWithoutVoice.push(i + 1) // 사용자에게 보여줄 때는 1부터 시작
        } else {
          console.log(`[handlePlayPause] 씬 ${i + 1}에 음성이 있습니다:`, sceneVoiceTemplate)
        }
      }
      
      console.log('[handlePlayPause] 음성이 없는 씬:', scenesWithoutVoice)
      
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
      
      setShowVoiceRequiredMessage(false)
      void currentFullPlayback?.playAllScenes()
    }
  }, [isPlaying, setRightPanelTab, setShowVoiceRequiredMessage, setScenesWithoutVoice, timelineRef, voiceTemplateRef, fullPlaybackRef])

  // 그룹 재생 핸들러 (useGroupPlayback 훅 사용)
  const handleGroupPlay = useCallback(async (sceneId: number, groupIndices: number[]) => {
    const currentGroupPlayback = groupPlaybackRef.current
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    console.log('[handleGroupPlay] 호출됨', { sceneId, groupIndices, groupPlayback: !!currentGroupPlayback })
    
    if (!currentGroupPlayback) return
    
    // 대상 그룹에 대한 음성 템플릿 존재 여부 확인 (씬별 voiceTemplate 우선, 없으면 전역 voiceTemplate)
    const hasVoiceForGroup = groupIndices.every((idx) => {
      const sceneVoice = currentTimeline?.scenes[idx]?.voiceTemplate
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
    
    // 이미 같은 그룹이 재생 중이면 정지
    if (currentGroupPlayback.playingGroupSceneId === sceneId) {
      console.log('[handleGroupPlay] 정지 호출')
      currentGroupPlayback.stopGroup()
      return
    }
    
    console.log('[handleGroupPlay] 재생 호출')
    setShowVoiceRequiredMessage(false)
    await currentGroupPlayback.playGroup(sceneId, groupIndices)
  }, [setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef, groupPlaybackRef])

  // 씬 재생 핸들러 (useGroupPlayback 훅 사용 - 단일 씬도 그룹으로 처리)
  const handleScenePlay = useCallback(async (sceneIndex: number) => {
    const currentGroupPlayback = groupPlaybackRef.current
    const currentTimeline = timelineRef.current
    const currentVoiceTemplate = voiceTemplateRef.current
    
    console.log('[handleScenePlay] 호출됨', { sceneIndex, groupPlayback: !!currentGroupPlayback, timeline: !!currentTimeline })
    try {
      // 음성 선택 여부 확인 (null, undefined, 빈 문자열 모두 체크)
      const sceneVoice = currentTimeline?.scenes[sceneIndex]?.voiceTemplate || currentVoiceTemplate
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
      
      // 이미 같은 씬이 재생 중이면 정지
      if (currentGroupPlayback?.playingSceneIndex === sceneIndex) {
        console.log('[handleScenePlay] 정지 호출')
        currentGroupPlayback.stopGroup()
        return
      }
      
      // 단일 씬도 useGroupPlayback을 사용하여 재생
      // sceneId는 undefined로 전달하고, groupIndices는 [sceneIndex]로 전달
      const scene = currentTimeline?.scenes[sceneIndex]
      const sceneId = scene?.sceneId
      console.log('[handleScenePlay] 재생 호출', { sceneId, sceneIndex })
      setShowVoiceRequiredMessage(false)
      if (currentGroupPlayback) {
        await currentGroupPlayback.playGroup(sceneId, [sceneIndex])
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, setRightPanelTab, setShowVoiceRequiredMessage, timelineRef, voiceTemplateRef, groupPlaybackRef])

  return {
    handlePlayPause,
    handleGroupPlay,
    handleScenePlay,
  }
}
