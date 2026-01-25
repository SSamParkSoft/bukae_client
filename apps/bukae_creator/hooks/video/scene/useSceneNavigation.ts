'use client'

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import type { TimelineData } from '@/lib/types/domain/timeline'
import type { SceneScript } from '@/lib/types/domain/script'
import { useTtsResources } from '../tts/useTtsResources'

interface UseSceneNavigationParams {
  timeline: TimelineData | null
  scenes: SceneScript[]
  currentSceneIndex: number
  setCurrentSceneIndex: (index: number) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  updateCurrentScene: (explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, partIndex?: number | null, sceneIndex?: number, overrideTransitionDuration?: number) => void
  setTimeline: (timeline: TimelineData) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  isPreviewingTransition: boolean
  setIsPreviewingTransition: (previewing: boolean) => void
  setCurrentTime: (time: number) => void
  voiceTemplate: string | null
  playbackSpeed: number
  buildSceneMarkup: (sceneIndex: number) => string[]
  makeTtsKey: (voice: string, markup: string) => string
  isPlayingRef: React.MutableRefObject<boolean>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  appRef: React.RefObject<PIXI.Application | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  loadAllScenes?: () => Promise<void>
  setSelectedPart?: (part: { sceneIndex: number; partIndex: number } | null) => void
  renderSceneContent?: (
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
      prepareOnly?: boolean
      isPlaying?: boolean
    }
  ) => void
  renderSceneImage?: (
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  renderSubtitlePart?: (
    sceneIndex: number,
    partIndex: number | null,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
      prepareOnly?: boolean
    }
  ) => void
  prepareImageAndSubtitle?: (
    sceneIndex: number,
    partIndex?: number,
    options?: {
      onComplete?: () => void
    }
  ) => void
}

export function useSceneNavigation({
  timeline,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPreviewingTransition: _isPreviewingTransition,
  setIsPreviewingTransition,
  setCurrentTime,
  voiceTemplate,
  playbackSpeed,
  buildSceneMarkup,
  makeTtsKey,
  isPlayingRef,
  textsRef,
  activeAnimationsRef,
  setSelectedPart,
  renderSceneContent,
  renderSceneImage,
  renderSubtitlePart,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prepareImageAndSubtitle: _prepareImageAndSubtitle,
}: UseSceneNavigationParams) {
  // TTS 리소스 가져오기
  const { ttsCacheRef, ttsAudioRef, ttsAudioUrlRef, stopTtsAudio, resetTtsSession } = useTtsResources()
  
  // playTimeoutRef는 내부에서 생성 (씬 네비게이션 전용)
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
        // Timeline kill 시 상태 복원
        // 재생 중일 때는 텍스트 alpha: 0 유지, 재생 중이 아닐 때는 alpha: 1 복원
        if (!skipStopPlaying) {
          // 재생 중이 아닐 때: 현재 씬의 텍스트를 alpha: 1로 복원
          const currentText = textsRef.current.get(index)
          if (currentText) {
            currentText.alpha = 1
            currentText.visible = true
          }
        }
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
    
    // 같은 그룹 내 다음 씬으로 자동 전환하는 함수
    const autoAdvanceToNextInGroup = (currentIdx: number) => {
      if (isPlayingRef.current) {
        return
      }
      
      const currentScene = timeline.scenes[currentIdx]
      if (!currentScene) {
        return
      }
      
      const nextScene = currentIdx + 1 < timeline.scenes.length ? timeline.scenes[currentIdx + 1] : null
      const isNextInSameGroup = nextScene && nextScene.sceneId === currentScene.sceneId
      
      if (!isNextInSameGroup) {
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
        } else {
          // 캐시에 없으면 fallback duration 사용
          const fallbackDuration = currentScene.duration
          waitTime = (fallbackDuration * 1000) / speed
        }
      } else {
        // voiceTemplate이 없으면 fallback duration 사용
        const fallbackDuration = currentScene.duration
        waitTime = (fallbackDuration * 1000) / speed
      }
      
      if (waitTime <= 0) {
        waitTime = 1000 // 최소 1초 대기
      }
      
      playTimeoutRef.current = setTimeout(() => {
        // 같은 그룹 내의 다음 씬으로 넘어갈 때는 자막만 변경
        const nextIndex = currentIdx + 1
        const nextScene = timeline.scenes[nextIndex]
        if (!nextScene) return
        
        // 다음 씬의 자막 텍스트 가져오기 (구간이 나뉘어져 있으면 첫 번째 구간만)
        const nextSceneText = nextScene.text?.content || ''
        const scriptParts = (nextSceneText || '').split(/\s*\|\|\|\s*/).map(part => (part && typeof part === 'string' ? part.trim() : '')).filter(part => part.length > 0)
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
        // skipAnimation 파라미터 제거: forceTransition === 'none'으로 처리
        updateCurrentScene(currentIdx, 'none', () => {
          // 자막 변경 완료 후 재귀적으로 다음 씬 처리
          autoAdvanceToNextInGroup(nextIndex)
        }, false, 0, nextIndex) // partIndex: 0 전달 (첫 번째 구간만 표시), sceneIndex: nextIndex 전달
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
          // 약간의 지연을 두고 호출하여 전환 효과가 완전히 완료된 후 자동 전환 시작
          setTimeout(() => {
            autoAdvanceToNextInGroup(index)
          }, 100)
        } 
      }
      
      // Timeline의 onComplete 콜백을 사용하여 전환 효과 완료 시점을 정확히 감지
      // 선택된 씬의 전환 효과를 forceTransition으로 전달하여 해당 씬의 전환 효과가 표시되도록 함
      // 재생 중/비재생 중 모두 renderSceneContent 사용 (통합 렌더링)
      if (renderSceneContent) {
        if (skipStopPlaying) {
          // 재생 중일 때: 최종 상태로 바로 렌더링하고 전환 효과 애니메이션만 적용
          // prepareOnly 단계 제거: 최종 상태로 바로 렌더링
          // 전환 효과가 'none'이어도 렌더링은 수행 (skipAnimation: false로 설정하여 렌더링 보장)
          renderSceneContent(index, 0, {
            skipAnimation: false, // 전환 효과가 'none'이어도 렌더링은 수행
            forceTransition: transition,
            previousIndex: prevIndex,
            updateTimeline: false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
            prepareOnly: false, // 최종 상태로 바로 렌더링 (전환 효과 애니메이션은 usePixiEffects에서 처리)
            onComplete: transitionCompleteCallback,
          })
        } else {
          // 재생 중이 아닐 때: renderSceneContent 사용
          // 씬 클릭 시에는 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
          // 씬 클릭 시에는 전환 효과 없이 즉시 표시
          // isManualSceneSelectRef를 false로 설정하여 자막이 렌더링되도록 보장
          isManualSceneSelectRef.current = false
          // previousSceneIndexRef를 index로 설정하여 updateCurrentScene이 같은 씬으로 인식하도록 함
          // (같은 씬을 다시 클릭한 경우를 대비)
          if (prevIndex === null || prevIndex === index) {
            previousSceneIndexRef.current = index
          }
          
          // 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
          const scene = timeline.scenes[index]
          let partIndexForScene: number | null = null
          if (scene?.text?.content) {
            const scriptParts = (scene.text.content || '').split(/\s*\|\|\|\s*/).map(part => (part && typeof part === 'string' ? part.trim() : '')).filter(part => part.length > 0)
            if (scriptParts.length > 1) {
              // 구간이 있으면 첫 번째 구간(0)만 표시
              partIndexForScene = 0
            } else {
              // 구간이 없으면 전체 자막 표시
              partIndexForScene = null
            }
          }
          
          // renderSceneContent 호출 전에 lastRenderedSceneIndexRef를 업데이트하지 않음
          // (prevIndex 계산에 영향을 주지 않도록)
          renderSceneContent(index, partIndexForScene, {
            skipAnimation: true, // 씬 클릭 시에는 전환 효과 없이 즉시 표시
            forceTransition: transition,
            previousIndex: prevIndex,
            updateTimeline: true, // 비재생 중에는 timeline 업데이트 가능
            prepareOnly: false,
            isPlaying: false, // 재생 중이 아니므로 자막 렌더링 필요
            onComplete: () => {
              // renderSceneContent 완료 후 lastRenderedSceneIndexRef 업데이트
              lastRenderedSceneIndexRef.current = index
              transitionCompleteCallback()
            },
          })
        }
      } else {
        // fallback: 기존 방식 (renderSceneContent가 없는 경우)
        // 재생 중이고 전환 효과가 'none'이면 애니메이션 스킵
        const shouldSkipAnimation = skipStopPlaying && transition === 'none'
        // renderSceneImage 사용 (이미지 전환만 처리)
        if (renderSceneImage) {
          renderSceneImage(index, {
            skipAnimation: shouldSkipAnimation,
            forceTransition: transition,
            previousIndex: prevIndex,
            onComplete: () => {
              // 전환 완료 후 첫 번째 구간 자막 렌더링
              if (renderSubtitlePart) {
                renderSubtitlePart(index, 0, { skipAnimation: true })
              }
              if (transitionCompleteCallback) {
                transitionCompleteCallback()
              }
            },
          })
        } else {
          // fallback: renderSceneImage가 없으면 updateCurrentScene 사용
          // skipAnimation 파라미터 제거: forceTransition으로 처리
          updateCurrentScene(prevIndex, transition, transitionCompleteCallback, skipStopPlaying, 0, index) // partIndex: 0 전달 (첫 번째 구간만 표시), sceneIndex: index 전달
        }
        // 렌더링은 PixiJS ticker가 처리
      }
      
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
    setCurrentSceneIndex,
    setTimeline,
    textsRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
    isManualSceneSelectRef,
    updateCurrentScene,
    renderSceneImage,
    renderSubtitlePart,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
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
    renderSceneContent,
  ])

  // 구간 선택 - 해당 구간의 자막만 표시
  const selectPart = useCallback((sceneIndex: number, partIndex: number) => {
    if (!timeline) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    // setSelectedPart 호출
    if (setSelectedPart) {
      setSelectedPart({ sceneIndex, partIndex })
    }
    
    // 씬 클릭과 동일하게 처리
    const prevIndex = previousSceneIndexRef.current
    const isSameScene = prevIndex === sceneIndex || (prevIndex === null && currentSceneIndexRef.current === sceneIndex)
    
    isManualSceneSelectRef.current = true // 구간 선택은 수동 선택으로 처리
    
    // currentSceneIndexRef 업데이트 (씬 클릭과 동일)
    currentSceneIndexRef.current = sceneIndex
    if (setCurrentSceneIndex) {
      setCurrentSceneIndex(sceneIndex)
    }
    
    // previousSceneIndexRef 업데이트
    if (prevIndex === null || prevIndex === sceneIndex) {
      previousSceneIndexRef.current = sceneIndex
    }
    
    // transitionCompleteCallback과 동일한 로직
    const transitionCompleteCallback = () => {
      lastRenderedSceneIndexRef.current = sceneIndex
      previousSceneIndexRef.current = sceneIndex
      setIsPreviewingTransition(false)
      isManualSceneSelectRef.current = false
    }
    
    // 같은 씬 내 구간 전환인 경우: 자막만 업데이트
    if (isSameScene && renderSubtitlePart) {
      renderSubtitlePart(sceneIndex, partIndex, {
        skipAnimation: true,
        onComplete: transitionCompleteCallback,
      })
      return
    }
    
    // 다른 씬으로 이동하는 경우: 씬 전환 후 자막 업데이트
    // 구간 선택 시 해당 구간의 자막만 표시 (partIndex 전달)
    if (renderSceneContent) {
      renderSceneContent(sceneIndex, partIndex, {
        skipAnimation: true,
        forceTransition: scene.transition,
        previousIndex: prevIndex,
        updateTimeline: true,
        prepareOnly: false,
        isPlaying: false,
        onComplete: transitionCompleteCallback,
      })
    } else if (renderSubtitlePart) {
      // renderSceneContent가 없으면 updateCurrentScene 후 renderSubtitlePart 사용
      if (updateCurrentScene) {
        // skipAnimation 파라미터 제거: forceTransition으로 처리
        updateCurrentScene(prevIndex, scene.transition, () => {
          renderSubtitlePart(sceneIndex, partIndex, {
            skipAnimation: true,
            onComplete: transitionCompleteCallback,
          })
        }, false, partIndex, sceneIndex)
      }
    }
  }, [timeline, setSelectedPart, renderSceneContent, renderSubtitlePart, updateCurrentScene, previousSceneIndexRef, isManualSceneSelectRef, currentSceneIndexRef, setCurrentSceneIndex, lastRenderedSceneIndexRef, setIsPreviewingTransition])

  return {
    selectScene,
    selectPart,
    currentSceneIndexRef,
    previousSceneIndexRef,
    lastRenderedSceneIndexRef,
  }
}

