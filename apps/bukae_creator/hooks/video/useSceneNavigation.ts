'use client'

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData, SceneScript } from '@/store/useVideoCreateStore'
import { authStorage } from '@/lib/api/auth-storage'

interface UseSceneNavigationParams {
  timeline: TimelineData | null
  scenes: SceneScript[]
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  updateCurrentScene: (skipAnimation?: boolean, prevIndex?: number | null, forceTransition?: string, onComplete?: () => void) => void
  setTimeline: (timeline: TimelineData) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  isPreviewingTransition: boolean
  setIsPreviewingTransition: (previewing: boolean) => void
  setCurrentTime: (time: number) => void
  resetTtsSession: () => void
  voiceTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (sceneIndex: number) => string[]
  makeTtsKey: (voice: string, markup: string) => string
  ttsCacheRef: React.MutableRefObject<Map<string, { blob: Blob; durationSec: number; markup: string; url?: string | null }>>
  stopTtsAudio: () => void
  ttsAudioRef: React.MutableRefObject<HTMLAudioElement | null>
  ttsAudioUrlRef: React.MutableRefObject<string | null>
  playTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  isPlayingRef: React.MutableRefObject<boolean>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  appRef: React.RefObject<PIXI.Application | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  loadAllScenes?: () => Promise<void>
  setSelectedPart?: (part: { sceneIndex: number; partIndex: number } | null) => void
}

export function useSceneNavigation({
  timeline,
  scenes,
  currentSceneIndex,
  setCurrentSceneIndex,
  currentSceneIndexRef,
  previousSceneIndexRef,
  lastRenderedSceneIndexRef,
  isManualSceneSelectRef,
  updateCurrentScene,
  setTimeline,
  isPlaying,
  setIsPlaying,
  isPreviewingTransition,
  setIsPreviewingTransition,
  setCurrentTime,
  resetTtsSession,
  voiceTemplate,
  playbackSpeed,
  buildSceneMarkup,
  makeTtsKey,
  ttsCacheRef,
  stopTtsAudio,
  ttsAudioRef,
  ttsAudioUrlRef,
  playTimeoutRef,
  isPlayingRef,
  textsRef,
  spritesRef,
  appRef,
  activeAnimationsRef,
  loadAllScenes,
  setSelectedPart,
}: UseSceneNavigationParams) {
  // 씬 선택
  const selectScene = useCallback((
    index: number,
    skipStopPlaying: boolean = false,
    onTransitionComplete?: () => void
  ) => {
    if (!timeline) return
    
    // 재생 중이 아니거나 skipStopPlaying이 false일 때만 재생 중지 (즉시 정지)
    if (isPlaying && !skipStopPlaying) {
      setIsPlaying(false)
      isPlayingRef.current = false
      resetTtsSession()
    }
    
    // 씬 클릭 시 즉시 수동 선택 플래그 설정하여 우선순위 확보
    // 단, 전체 컨테이너 클릭 시에는 플래그를 설정하지 않음 (자동 전환 효과를 위해)
    // isManualSceneSelectRef.current는 handleScenePartSelect에서만 true로 설정되어야 함
    // isManualSceneSelectRef.current = true
    currentSceneIndexRef.current = index
    // currentSceneIndex 상태도 즉시 업데이트하여 재생 버튼이 올바른 씬부터 시작하도록 함
    setCurrentSceneIndex(index)
    
    // 진행 중인 애니메이션 중지
    activeAnimationsRef.current.forEach((tl) => {
      if (tl && tl.isActive()) {
        tl.kill()
      }
    })
    activeAnimationsRef.current.clear()
    
    let timeUntilScene = 0
    for (let i = 0; i < index; i++) {
      const scene = timeline.scenes[i]
      const isLastScene = i === timeline.scenes.length - 1
      const nextScene = !isLastScene ? timeline.scenes[i + 1] : null
      const isSameSceneId = nextScene && scene.sceneId === nextScene.sceneId
      // 같은 그룹 내 씬들 사이에서는 transitionDuration을 0으로 계산
      const transitionDuration = isLastScene ? 0 : (isSameSceneId ? 0 : (scene.transitionDuration || 0.5))
      timeUntilScene += scene.duration + transitionDuration
    }
    
    // 전환 효과 미리보기 활성화
    setIsPreviewingTransition(true)
    
    // 이전 씬 인덱스 계산
    // 씬 리스트에서 선택할 때: 현재 렌더링된 씬을 이전 씬으로 사용
    // 같은 씬을 다시 선택하는 경우: null로 설정하여 페이드 인 효과 적용
    let prevIndex: number | null = null
    if (skipStopPlaying) {
      // 재생 중일 때: 이전 씬 인덱스를 올바르게 설정
      if (lastRenderedSceneIndexRef.current !== null && lastRenderedSceneIndexRef.current !== index) {
        // 다른 씬에서 선택된 씬으로 전환
        prevIndex = lastRenderedSceneIndexRef.current
      } else if (index > 0) {
        // 첫 씬이 아니면 이전 씬으로 설정
        prevIndex = index - 1
      } else {
        // 첫 씬일 때는 null로 설정하여 페이드 인 효과 적용
        prevIndex = null
      }
    } else {
      // 씬 리스트에서 선택할 때: 현재 렌더링된 씬을 이전 씬으로 사용
      // 같은 씬을 다시 선택하는 경우: null로 설정하여 페이드 인 효과 적용
      if (lastRenderedSceneIndexRef.current !== null && lastRenderedSceneIndexRef.current !== index) {
        // 다른 씬에서 선택된 씬으로 전환
        prevIndex = lastRenderedSceneIndexRef.current
      } else if (lastRenderedSceneIndexRef.current === index) {
        // 같은 씬을 다시 선택: 페이드 인 효과 적용
        prevIndex = null
      } else {
        // 처음 선택하는 경우: index > 0이면 이전 씬으로, 아니면 null
        prevIndex = index > 0 ? index - 1 : null
      }
    }
    
    setCurrentTime(timeUntilScene)
    // 선택된 씬의 전환 효과 가져오기
    const selectedScene = timeline.scenes[index]
    const previousScene = prevIndex !== null ? timeline.scenes[prevIndex] : null
    // 같은 sceneId를 가진 씬들 사이에서는 transition 무시
    const isSameSceneId = previousScene && previousScene.sceneId === selectedScene?.sceneId
    const transition = isSameSceneId ? 'none' : (selectedScene?.transition || 'fade')
    
    // 씬 리스트에서 선택할 때는 이전 씬을 보여주지 않고 검은 캔버스에서 시작
    // 단, 이전 씬이 같은 그룹 내 씬이고 현재 씬도 같은 그룹의 첫 번째 씬이 아닌 경우에만 prevIndex 유지
    if (!skipStopPlaying) {
      const isFirstInGroup = index === timeline.scenes.findIndex((s) => s.sceneId === selectedScene?.sceneId)
      
      // 이전 씬이 같은 그룹이고, 현재 씬이 같은 그룹의 첫 번째 씬이 아닌 경우에만 prevIndex 유지
      const isPrevInSameGroup = previousScene && selectedScene && previousScene.sceneId === selectedScene.sceneId
      
      // 같은 그룹 내 씬인 경우 prevIndex를 유지하여 자막만 변경하도록 함
      if (isPrevInSameGroup && !isFirstInGroup && selectedScene?.sceneId) {
        // prevIndex 유지 (같은 그룹 내 씬이므로)
      } else if (selectedScene?.sceneId && lastRenderedSceneIndexRef.current !== null && !isFirstInGroup) {
        // 같은 그룹 내 씬인지 확인 (lastRenderedSceneIndexRef 사용)
        const lastRenderedScene = timeline.scenes[lastRenderedSceneIndexRef.current]
        if (lastRenderedScene && lastRenderedScene.sceneId === selectedScene.sceneId) {
          // 같은 그룹 내 씬이므로 prevIndex를 lastRenderedSceneIndexRef로 설정
          prevIndex = lastRenderedSceneIndexRef.current
        } else {
          prevIndex = null
        }
      } else {
        prevIndex = null
      }
    }
    
    // 클릭한 씬의 렌더링을 즉시 시작하도록 우선순위 확보
    lastRenderedSceneIndexRef.current = index
    
    // 같은 그룹 내 다음 씬으로 자동 전환하는 함수
    const autoAdvanceToNextInGroup = (currentIdx: number) => {
      console.log(`[handleSceneSelect] autoAdvanceToNextInGroup 호출: currentIdx=${currentIdx}, voiceTemplate=${!!voiceTemplate}, isPlaying=${isPlayingRef.current}`)
      
      if (isPlayingRef.current) {
        console.log(`[handleSceneSelect] 재생 중이므로 자동 전환 중지`)
        return
      }
      
      const currentScene = timeline.scenes[currentIdx]
      if (!currentScene) {
        console.log(`[handleSceneSelect] currentScene이 null입니다`)
        return
      }
      
      const nextScene = currentIdx + 1 < timeline.scenes.length ? timeline.scenes[currentIdx + 1] : null
      const isNextInSameGroup = nextScene && nextScene.sceneId === currentScene.sceneId
      
      console.log(`[handleSceneSelect] 다음 씬 확인: nextScene=${!!nextScene}, isNextInSameGroup=${isNextInSameGroup}, currentSceneId=${currentScene.sceneId}, nextSceneId=${nextScene?.sceneId}`)
      
      if (!isNextInSameGroup) {
        console.log(`[handleSceneSelect] 같은 그룹 내 다음 씬이 없으므로 종료`)
        return
      }
      
      const speed = timeline?.playbackSpeed ?? playbackSpeed ?? 1.0
      let waitTime = 0
      
      // TTS 재생 및 duration 후 자동 전환
      if (voiceTemplate) {
        const markups = buildSceneMarkup(currentIdx)
        // TODO: 각 구간별로 순차 재생하도록 수정 필요
        const markup = markups.length > 0 ? markups[0] : null
        const key = markup ? makeTtsKey(voiceTemplate, markup) : null
        const cached = key ? ttsCacheRef.current.get(key) : null
        
        if (cached) {
          const { blob, durationSec } = cached
          stopTtsAudio()
          const url = URL.createObjectURL(blob)
          ttsAudioUrlRef.current = url
          const audio = new Audio(url)
          audio.playbackRate = speed
          ttsAudioRef.current = audio
          audio.onended = () => stopTtsAudio()
          audio.play().catch(() => {})
          
          const sceneDuration = durationSec > 0 ? durationSec : currentScene.duration
          waitTime = (sceneDuration * 1000) / speed
          console.log(`[handleSceneSelect] TTS 캐시 사용: duration=${durationSec}, waitTime=${waitTime}`)
        } else {
          // 캐시에 없으면 fallback duration 사용
          const fallbackDuration = currentScene.duration
          waitTime = (fallbackDuration * 1000) / speed
          console.log(`[handleSceneSelect] TTS 캐시 없음, fallback duration 사용: waitTime=${waitTime}`)
        }
      } else {
        // voiceTemplate이 없으면 fallback duration 사용
        const fallbackDuration = currentScene.duration
        waitTime = (fallbackDuration * 1000) / speed
        console.log(`[handleSceneSelect] voiceTemplate 없음, fallback duration 사용: waitTime=${waitTime}`)
      }
      
      if (waitTime <= 0) {
        console.log(`[handleSceneSelect] waitTime이 0 이하이므로 즉시 전환`)
        waitTime = 1000 // 최소 1초 대기
      }
      
      playTimeoutRef.current = setTimeout(() => {
        console.log(`[handleSceneSelect] setTimeout 실행: currentIdx=${currentIdx} -> nextIndex=${currentIdx + 1}`)
        // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
        const nextIndex = currentIdx + 1
        const nextScene = timeline.scenes[nextIndex]
        if (!nextScene) return
        
        // 다음 씬의 자막 텍스트 가져오기 (구간이 나뉘어져 있으면 첫 번째 구간만)
        const nextSceneText = nextScene.text?.content || ''
        const scriptParts = nextSceneText.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
        const displayText = scriptParts.length > 1 ? scriptParts[0] : nextSceneText
        
        // timeline 업데이트하여 자막 변경
        const updatedTimeline = {
          ...timeline,
          scenes: timeline.scenes.map((s, i) =>
            i === nextIndex
              ? {
                  ...s,
                  text: {
                    ...s.text,
                    content: displayText,
                  },
                }
              : s
          ),
        }
        setTimeline(updatedTimeline)
        
        setCurrentSceneIndex(nextIndex)
        currentSceneIndexRef.current = nextIndex
        lastRenderedSceneIndexRef.current = nextIndex
        
        // updateCurrentScene을 직접 호출하여 자막만 변경 (전환 효과 없음)
        // previousIndex는 currentIdx (현재 씬이 이전 씬이 됨)로 전달하여 같은 그룹으로 인식되도록 함
        // 전환 효과를 'none'으로 설정하여 자막만 변경되도록 함
        updateCurrentScene(false, currentIdx, 'none', () => {
          console.log(`[handleSceneSelect] updateCurrentScene 완료, 다음 씬으로 재귀 호출`)
          // 자막 변경 완료 후 재귀적으로 다음 씬 처리
          autoAdvanceToNextInGroup(nextIndex)
        })
      }, waitTime)
    }
    
    requestAnimationFrame(() => {
      // 씬 리스트에서 선택할 때와 재생 중일 때 모두 전환 효과 적용
      const transitionCompleteCallback = () => {
        
        // 전환 효과 완료 후 lastRenderedSceneIndexRef 업데이트
        lastRenderedSceneIndexRef.current = index
        previousSceneIndexRef.current = index
      
        // currentSceneIndex는 이미 handleSceneSelect 시작 부분에서 업데이트되었으므로
        // 여기서는 중복 업데이트하지 않음 (상태 업데이트는 이미 완료됨)
        
        // 재생 중이 아닐 때만 플래그 해제
        if (!skipStopPlaying || !isPlayingRef.current) {
          setIsPreviewingTransition(false)
          isManualSceneSelectRef.current = false
        }
        
        // 전환 효과 완료 콜백 호출 (재생 중 다음 씬으로 넘어갈 때 사용)
        if (onTransitionComplete) {
          onTransitionComplete()
        }
        
        // 수동으로 씬을 클릭한 경우(!skipStopPlaying)에는 자동 전환하지 않음
        // 재생 중일 때만 자동 전환 (skipStopPlaying이 true일 때)
        if (skipStopPlaying && !isPlayingRef.current) {
          console.log(`[handleSceneSelect] transitionCompleteCallback에서 autoAdvanceToNextInGroup 호출: index=${index}`)
          // 약간의 지연을 두고 호출하여 전환 효과가 완전히 완료된 후 자동 전환 시작
          setTimeout(() => {
            autoAdvanceToNextInGroup(index)
          }, 100)
        } 
      }
      
      // Timeline의 onComplete 콜백을 사용하여 전환 효과 완료 시점을 정확히 감지
      // 선택된 씬의 전환 효과를 forceTransition으로 전달하여 해당 씬의 전환 효과가 표시되도록 함
      updateCurrentScene(false, prevIndex, transition, transitionCompleteCallback)
      
      // 수동으로 씬을 클릭한 경우(!skipStopPlaying)에는 자동 전환하지 않음
      // 재생 중일 때만 자동 전환 (skipStopPlaying이 true일 때)
      if (skipStopPlaying && !isPlayingRef.current) {
        const selectedScene = timeline.scenes[index]
        const nextScene = index + 1 < timeline.scenes.length ? timeline.scenes[index + 1] : null
        const isNextInSameGroup = nextScene && nextScene.sceneId === selectedScene?.sceneId
        const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']
        const isMovementEffect = MOVEMENT_EFFECTS.includes(selectedScene?.transition || '')
        
        if (isMovementEffect && isNextInSameGroup) {
          // 움직임 효과이고 같은 그룹 내 다음 씬이 있으면, 전환 효과 시작 후 자동 전환 시도
          // onComplete가 호출되지 않을 수 있으므로 약간의 지연 후 직접 호출
          setTimeout(() => {
            console.log(`[handleSceneSelect] 움직임 효과 자동 전환 시도 (fallback): index=${index}`)
            // transitionCompleteCallback이 이미 호출되었는지 확인하고, 호출되지 않았으면 직접 호출
            if (lastRenderedSceneIndexRef.current === index) {
              autoAdvanceToNextInGroup(index)
            }
          }, 500) // 전환 효과가 시작된 후 500ms 후에 자동 전환 시도
        }
      }
    })
  }, [
    timeline,
    currentSceneIndex,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
    isManualSceneSelectRef,
    updateCurrentScene,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    isPreviewingTransition,
    setIsPreviewingTransition,
    resetTtsSession,
    voiceTemplate,
    playbackSpeed,
    buildSceneMarkup,
    makeTtsKey,
    ttsCacheRef,
    stopTtsAudio,
    ttsAudioRef,
    ttsAudioUrlRef,
    playTimeoutRef,
    isPlayingRef,
    activeAnimationsRef,
  ])

  // 구간 선택
  const selectPart = useCallback((sceneIndex: number, partIndex: number) => {
    if (!timeline) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    // 원본 script 가져오기
    const sceneId = scene.sceneId
    let originalScript = ''
    
    if (sceneId !== undefined) {
      const firstSceneScript = scenes.find((s) => s.sceneId === sceneId)
      if (firstSceneScript?.script) {
        originalScript = firstSceneScript.script
      }
    }
    
    if (!originalScript) {
      originalScript = scene.text?.content || ''
    }
    
    // ||| 구분자로 분할
    const scriptParts = originalScript.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
    const partText = scriptParts[partIndex]?.trim()
    
    if (!partText) return

    // timeline의 text.content 업데이트
    const updatedTimeline = {
      ...timeline,
      scenes: timeline.scenes.map((s, i) => {
        if (i === sceneIndex) {
          return {
            ...s,
            text: {
              ...s.text,
              content: partText,
            },
          }
        }
        return s
      }),
    }
    setTimeline(updatedTimeline)
    
    // 텍스트 객체 찾기
    let targetTextObj: PIXI.Text | null = textsRef.current.get(sceneIndex) || null
    
    // 현재 씬의 텍스트 객체가 없거나 보이지 않으면, 같은 그룹 내 첫 번째 씬의 텍스트 사용
    if (!targetTextObj || (!targetTextObj.visible && targetTextObj.alpha === 0)) {
      if (sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
        if (firstSceneIndexInGroup >= 0) {
          targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }
    }
    
    // 같은 씬 내 구간 전환인지 확인
    const isSameSceneTransition = currentSceneIndexRef.current === sceneIndex
    
    if (targetTextObj) {
      // 텍스트 업데이트 (항상 업데이트)
      targetTextObj.text = partText
      targetTextObj.visible = true
      targetTextObj.alpha = 1
      
      // 스프라이트 표시
      const currentSprite = spritesRef.current.get(sceneIndex)
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      
      // 같은 씬 내 구간 전환인 경우: 자막만 업데이트 (전환 효과 없음)
      if (isSameSceneTransition) {
        // 자막 업데이트 확인
        console.log(`[구간 선택] 같은 씬 내 구간 전환: 씬 ${sceneIndex}, 구간 ${partIndex}, 텍스트: "${partText.substring(0, 30)}..."`)
        if (appRef.current) {
          appRef.current.render()
        }
        if (setSelectedPart) {
          setSelectedPart({ sceneIndex, partIndex })
        }
        return
      }
      
      // 다른 씬으로 이동하는 경우: 씬 전환 및 구간 텍스트 표시
      console.log(`[구간 선택] 다른 씬으로 이동: 씬 ${sceneIndex}, 구간 ${partIndex}, 텍스트: "${partText.substring(0, 30)}..."`)
      currentSceneIndexRef.current = sceneIndex
      setCurrentSceneIndex(sceneIndex)
      // updateCurrentScene 호출하여 씬 전환 (구간 텍스트는 이미 업데이트됨)
      updateCurrentScene(false, currentSceneIndexRef.current, undefined, () => {
        // 전환 완료 후 구간 텍스트가 올바르게 표시되었는지 확인
        const finalText = textsRef.current.get(sceneIndex)
        if (finalText && finalText.text !== partText) {
          finalText.text = partText
          if (appRef.current) {
            appRef.current.render()
          }
        }
      })
    } else {
      // 텍스트 객체가 없으면 loadAllScenes 호출
      if (loadAllScenes) {
        loadAllScenes().then(() => {
          setTimeout(() => {
            let text = textsRef.current.get(sceneIndex) || undefined
            if (!text && sceneId !== undefined) {
              const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
              if (firstSceneIndexInGroup >= 0) {
                text = textsRef.current.get(firstSceneIndexInGroup) || undefined
              }
            }
            
            if (text) {
              text.text = partText
              text.visible = true
              text.alpha = 1
              
              if (isSameSceneTransition) {
                // 같은 씬 내 구간 전환: 자막만 업데이트
                if (appRef.current) {
                  appRef.current.render()
                }
                if (setSelectedPart) {
                  setSelectedPart({ sceneIndex, partIndex })
                }
              } else {
                // 다른 씬으로 이동: 씬 전환 및 구간 텍스트 표시
                currentSceneIndexRef.current = sceneIndex
                setCurrentSceneIndex(sceneIndex)
                updateCurrentScene(false, currentSceneIndexRef.current, undefined, () => {
                  // 전환 완료 후 구간 텍스트가 올바르게 표시되었는지 확인
                  const finalText = textsRef.current.get(sceneIndex)
                  if (finalText && finalText.text !== partText) {
                    finalText.text = partText
                    if (appRef.current) {
                      appRef.current.render()
                    }
                  }
                })
              }
            }
          }, 100)
        })
      }
    }
    
    if (setSelectedPart) {
      setSelectedPart({ sceneIndex, partIndex })
    }
  }, [
    timeline,
    scenes,
    setTimeline,
    setCurrentSceneIndex,
    currentSceneIndexRef,
    updateCurrentScene,
    textsRef,
    spritesRef,
    appRef,
    loadAllScenes,
    setSelectedPart,
  ])

  return {
    selectScene,
    selectPart,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
  }
}

