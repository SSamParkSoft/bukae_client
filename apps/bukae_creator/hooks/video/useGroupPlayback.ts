'use client'

import { useCallback, useState, useRef } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { movements } from '@/lib/data/transitions'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { useTtsResources } from './useTtsResources'
import { getSoundEffectStorageUrl } from '@/lib/utils/supabase-storage'

interface UseGroupPlaybackParams {
  timeline: TimelineData | null
  voiceTemplate: string | null
  buildSceneMarkup: (timeline: TimelineData | null, sceneIndex: number) => string[]
  makeTtsKey: (voiceName: string, markup: string) => string
  ensureSceneTts?: (sceneIndex: number, signal?: AbortSignal, forceRegenerate?: boolean) => Promise<{ sceneIndex: number; parts: Array<{ blob: Blob; durationSec: number; url: string | null; partIndex: number; markup: string }> }>
  renderSceneContent: (
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
      transitionDuration?: number
    }
  ) => void
  setTimeline: (timeline: TimelineData) => void
  currentSceneIndexRef: React.MutableRefObject<number>
  lastRenderedSceneIndexRef: React.MutableRefObject<number | null>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  containerRef: React.RefObject<PIXI.Container | null>
  changedScenesRef: React.MutableRefObject<Set<number>>
  isPlayingRef: React.MutableRefObject<boolean>
  setIsPreparing?: (preparing: boolean) => void
  setIsTtsBootstrapping?: (bootstrapping: boolean) => void
  activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
}

export function useGroupPlayback({
  timeline,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  ensureSceneTts: ensureSceneTtsParam,
  renderSceneContent,
  setTimeline,
  currentSceneIndexRef,
  lastRenderedSceneIndexRef,
  textsRef,
  spritesRef,
  containerRef,
  changedScenesRef,
  isPlayingRef,
  setIsPreparing,
  setIsTtsBootstrapping,
  activeAnimationsRef,
}: UseGroupPlaybackParams) {
  // TTS 리소스 가져오기
  const { ttsCacheRef, ttsAudioRef, ttsAudioUrlRef, stopTtsAudio } = useTtsResources()
  const { getSceneStructure } = useSceneStructureStore()
  const resolveSoundEffectUrl = (filePath: string): string => {
    return getSoundEffectStorageUrl(filePath) ?? `/sound-effects/${filePath}`
  }
  
  // 재생 중인 씬 인덱스 추적 (단일 씬 재생용)
  const [playingSceneIndex, setPlayingSceneIndex] = useState<number | null>(null)
  const playingSceneIndexRef = useRef<number | null>(null)
  
  // 재생 중인 그룹의 sceneId 추적 (그룹 재생용)
  const [playingGroupSceneId, setPlayingGroupSceneId] = useState<number | null>(null)
  const playingGroupSceneIdRef = useRef<number | null>(null)

  // TTS 캐시 확인 및 필요한 씬 찾기
  const findScenesToSynthesize = useCallback((groupIndices: number[]): number[] => {
    const scenesToSynthesize: number[] = []
    for (const sceneIndex of groupIndices) {
      const scene = timeline?.scenes[sceneIndex]
      if (!scene) continue
      // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      if (!sceneVoiceTemplate) continue
      
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const hasAllCache = markups.every(markup => {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      })
      if (!hasAllCache) {
        scenesToSynthesize.push(sceneIndex)
      }
    }
    return scenesToSynthesize
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

  // TTS 합성 및 캐시 저장 (병렬 처리로 최적화)
  const synthesizeAndCacheTts = useCallback(async (scenesToSynthesize: number[]): Promise<boolean> => {
    if (!ensureSceneTtsParam || scenesToSynthesize.length === 0) {
      return true
    }

    setIsPreparing?.(true)
    setIsTtsBootstrapping?.(true)

    try {
      // 병렬로 모든 씬의 TTS 합성 (useFullPlayback과 동일한 방식)
      const ttsResults = await Promise.all(
        scenesToSynthesize.map(sceneIndex =>
          ensureSceneTtsParam(
          sceneIndex,
          undefined,
          changedScenesRef.current.has(sceneIndex)
        )
        )
      )
      
      // 결과를 캐시에 저장
      for (const result of ttsResults) {
        const { sceneIndex, parts } = result
        if (!parts || parts.length === 0) {
          console.warn(`[useGroupPlayback] 씬 ${sceneIndex} parts가 비어있음`)
          continue
        }
        
        const scene = timeline!.scenes[sceneIndex]
        // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
        const sceneVoiceTemplate = scene?.voiceTemplate || voiceTemplate!
        
        const markups = buildSceneMarkup(timeline!, sceneIndex)
        for (let i = 0; i < parts.length && i < markups.length; i++) {
          const part = parts[i]
          const partMarkup = markups[i]
          if (part && partMarkup) {
            const partKey = makeTtsKey(sceneVoiceTemplate, partMarkup)
            ttsCacheRef.current.set(partKey, {
              blob: part.blob,
              durationSec: part.durationSec,
              markup: part.markup || partMarkup,
              url: part.url || null,
            })
          }
        }
      }
      
      return true
    } catch (error) {
      console.error('[useGroupPlayback] TTS 생성 실패:', error)
      return false
    } finally {
      setIsPreparing?.(false)
      setIsTtsBootstrapping?.(false)
    }
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef, ensureSceneTtsParam, changedScenesRef, setIsPreparing, setIsTtsBootstrapping])

  // 그룹 TTS duration 계산
  const calculateGroupTtsDuration = useCallback((sceneId: number | undefined, groupIndices: number[]): number => {
    // 항상 최신 TTS 캐시에서 직접 계산하여 정확한 duration 보장
    let duration = 0
    if (timeline) {
      for (const sceneIndex of groupIndices) {
        const scene = timeline.scenes[sceneIndex]
        if (!scene) continue
        // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
        const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
        if (!sceneVoiceTemplate) continue
        
        const markups = buildSceneMarkup(timeline, sceneIndex)
        for (const markup of markups) {
          const key = makeTtsKey(sceneVoiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached?.durationSec) {
            duration += cached.durationSec
          }
        }
      }
    }
    return duration
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

  // 특정 씬/구간의 TTS durationSec을 캐시에서 가져오기 (fallback: 씬 duration -> 1초)
  const getPartTtsDuration = useCallback(
    (sceneIndex: number, partIndex: number): number => {
      if (!timeline) return 1
      const scene = timeline.scenes[sceneIndex]
      if (!scene) return 1

      const sceneVoiceTemplate = scene.voiceTemplate || voiceTemplate
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const markup = markups?.[partIndex]
      if (sceneVoiceTemplate && markup) {
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        const cached = ttsCacheRef.current.get(key)
        if (cached?.durationSec && cached.durationSec > 0) {
          return cached.durationSec
        }
      }
      // fallback: 씬 duration 또는 1초
      return scene.duration || 1
    },
    [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef]
  )

  // 자막 파싱 및 병합
  const parseMergedTextParts = useCallback((groupIndices: number[], updatedTimeline: TimelineData): Array<{ text: string; sceneIndex: number; partIndex: number }> => {
    const mergedTextParts: Array<{ text: string; sceneIndex: number; partIndex: number }> = []
    const firstSceneIndex = groupIndices[0]
    const firstSceneStructure = getSceneStructure(firstSceneIndex)
    const fullSubtitleFromStore = firstSceneStructure?.fullSubtitle

    if (fullSubtitleFromStore) {
      // store의 fullSubtitle 사용 (자막 씬 분할 시 원본 전체 자막 포함)
      const scriptParts = splitSubtitleByDelimiter(fullSubtitleFromStore)
      for (let partIdx = 0; partIdx < scriptParts.length; partIdx++) {
        const partText = scriptParts[partIdx]?.trim()
        if (partText) {
          const sceneIndex = groupIndices[Math.min(partIdx, groupIndices.length - 1)]
          mergedTextParts.push({
            text: partText,
            sceneIndex,
            partIndex: 0,
          })
        }
      }
    } else {
      // 기존 방식: 각 씬의 자막을 개별적으로 파싱
      for (const idx of groupIndices) {
        const scene = updatedTimeline.scenes[idx]
        if (!scene) continue
        
        const fullSubtitle = scene.text?.content || ''
        const scriptParts = splitSubtitleByDelimiter(fullSubtitle)
        
        for (let partIdx = 0; partIdx < scriptParts.length; partIdx++) {
          const partText = scriptParts[partIdx]?.trim()
          if (partText) {
            mergedTextParts.push({
              text: partText,
              sceneIndex: idx,
              partIndex: partIdx,
            })
          }
        }
      }
    }

    return mergedTextParts
  }, [getSceneStructure])

  // 텍스트 객체 찾기
  const findTextObject = useCallback((sceneIndex: number, updatedTimeline: TimelineData): PIXI.Text | null => {
    const scene = updatedTimeline.scenes[sceneIndex]
    if (scene?.sceneId !== undefined) {
      const firstSceneIndexInGroup = updatedTimeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
      if (firstSceneIndexInGroup >= 0) {
        return textsRef.current.get(firstSceneIndexInGroup) || null
      }
    }
    return textsRef.current.get(sceneIndex) || null
  }, [textsRef])

  // 오디오 정리
  const cleanupAudio = useCallback(() => {
    stopTtsAudio()
  }, [stopTtsAudio])

  // 그룹 재생 정지 함수
  const stopGroup = useCallback(() => {
    // 진행 중인 전환 효과 애니메이션 중지
    if (activeAnimationsRef) {
      activeAnimationsRef.current.forEach((tl) => {
        if (tl && tl.isActive()) {
          tl.kill()
        }
      })
      activeAnimationsRef.current.clear()
    }
    
    // TTS 오디오 정지
    stopTtsAudio()
    
    // 재생 중인 씬 인덱스 초기화
    setPlayingSceneIndex(null)
    playingSceneIndexRef.current = null
    
    // 재생 중인 그룹 sceneId 초기화
    setPlayingGroupSceneId(null)
    playingGroupSceneIdRef.current = null
    
    // 재생 상태 초기화
    isPlayingRef.current = false
  }, [stopTtsAudio, isPlayingRef, activeAnimationsRef])


  /**
   * 그룹 재생 함수
   */
  const playGroup = useCallback(async (sceneId: number | undefined, groupIndices: number[]) => {
    if (!timeline || !ensureSceneTtsParam) {
      return
    }
    // 그룹/씬 내에 적용 가능한 음성 템플릿이 하나라도 있는지 확인
    const hasAnyVoice = groupIndices.some((idx) => {
      const sceneVoice = timeline.scenes[idx]?.voiceTemplate
      const resolvedVoice = sceneVoice || voiceTemplate
      return !!resolvedVoice && resolvedVoice.trim() !== ''
    })
    if (!hasAnyVoice) return

    // 단일 씬 재생도 지원 (sceneId가 undefined이거나 groupIndices가 1개인 경우)
    const isSingleScene = sceneId === undefined || groupIndices.length === 1
    const firstSceneIndex = groupIndices[0]

    // 단일 씬 재생인 경우: 이미 같은 씬이 재생 중이면 정지
    if (isSingleScene && playingSceneIndexRef.current === firstSceneIndex && ttsAudioRef.current) {
      stopGroup()
      return
    }
    
    // 그룹 재생인 경우: 이미 같은 그룹이 재생 중이면 정지
    if (!isSingleScene && sceneId !== undefined && playingGroupSceneIdRef.current === sceneId && ttsAudioRef.current) {
      stopGroup()
      return
    }

    if (isSingleScene) {
      // 재생 중인 씬 인덱스 설정
      setPlayingSceneIndex(firstSceneIndex)
      playingSceneIndexRef.current = firstSceneIndex
      // 그룹 재생 상태 초기화
      setPlayingGroupSceneId(null)
      playingGroupSceneIdRef.current = null
    } else {
      // 그룹 재생인 경우 재생 중인 씬 인덱스 초기화
      setPlayingSceneIndex(null)
      playingSceneIndexRef.current = null
      // 그룹 재생 상태 설정
      if (sceneId !== undefined) {
        setPlayingGroupSceneId(sceneId)
        playingGroupSceneIdRef.current = sceneId
      }
    }

    // 1. 그룹화된 씬 확인
    const groupScenes = groupIndices.map(index => timeline.scenes[index]).filter(Boolean)
    if (groupScenes.length === 0) {
      console.warn('[useGroupPlayback] 그룹에 유효한 씬이 없습니다.')
      return
    }

    // 2. TTS 캐시 확인 및 합성
    const scenesToSynthesize = findScenesToSynthesize(groupIndices)
    const synthesisSuccess = await synthesizeAndCacheTts(scenesToSynthesize)
    if (!synthesisSuccess) {
      return
    }

    // 3. TTS Duration 계산은 각 구간마다 개별적으로 수행 (움직임 효과는 각 구간의 TTS 듀레이션 사용)

    // 첫 번째 씬 transitionDuration 보정: 움직임이면 해당 씬의 파트0 TTS 길이, 아니면 1초
    const firstScene = timeline.scenes[firstSceneIndex]
    const originalTransitionDuration = firstScene?.transitionDuration
    let updatedTimeline = timeline
    if (firstScene) {
      const isMovementFirst = movements.some((m) => m.value === (firstScene.transition || ''))
      const firstPartDuration = getPartTtsDuration(firstSceneIndex, 0)
      // 움직임은 TTS 길이, 비움직임은 1초 고정
      const transitionDurationForFirst = isMovementFirst ? Math.max(firstPartDuration, 1) : 1

      updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) => {
          if (idx !== firstSceneIndex) return scene
          return {
            ...scene,
            transitionDuration: transitionDurationForFirst,
          }
        }),
      }
      setTimeline(updatedTimeline)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    }

    // 재생 준비
    const abortController = new AbortController()
    isPlayingRef.current = true

    try {
      // 오디오 정리
      cleanupAudio()
      
      // 첫 번째 씬: 전환 효과만 표시
      const firstSceneIndexForRender = groupIndices[0]
        const firstSceneForRender = updatedTimeline.scenes[firstSceneIndexForRender]
      currentSceneIndexRef.current = firstSceneIndexForRender
      
      // 그룹 재생 시작 전에 컨테이너의 모든 자식 제거 및 숨김
      if (containerRef.current) {
        // 컨테이너의 모든 자식을 제거 (스프라이트와 텍스트 모두)
        const container = containerRef.current
        const containerChildren = Array.from(container.children)
        containerChildren.forEach((child) => {
          container.removeChild(child)
          if (child instanceof PIXI.Sprite) {
            child.visible = false
            child.alpha = 0
          } else if (child instanceof PIXI.Text) {
            child.visible = false
            child.alpha = 0
          }
        })
      }
      
      // spritesRef와 textsRef의 모든 요소도 숨김
      spritesRef.current.forEach((sprite) => {
        if (sprite) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      // 씬이 넘어갔을 때만 이전 씬의 텍스트 숨김 (기본적으로는 모든 텍스트를 보이게 유지)
      // 이 부분은 제거 - 씬이 넘어갔을 때만 이전 씬의 텍스트를 숨기도록 변경
      
      // 자막 파싱
      const mergedTextParts = parseMergedTextParts(groupIndices, updatedTimeline)
      // mergedTextParts.length === 0이어도 finally 블록이 실행되도록 try 블록 내에서 처리

      // 텍스트 객체 찾기
      const textToUpdate = findTextObject(firstSceneIndex, updatedTimeline)
      
      // 텍스트가 컨테이너에 없으면 추가하고 표시
        // 텍스트 재렌더링하지 않음 (이미 보이는 상태라면 그대로 유지)
      
      if (renderSceneContent) {
        // 렌더링 경로 확인: 그룹 재생 시작에서 renderSceneContent 사용
        const isMovement = movements.some((m) => m.value === (firstSceneForRender?.transition || ''))
        
        // 첫 번째 구간의 실제 partIndex를 사용하여 TTS 듀레이션 계산
        let transitionDurationForRender = 1
        if (isMovement && mergedTextParts.length > 0) {
          const firstPart = mergedTextParts[0]
          const partDuration = getPartTtsDuration(firstPart.sceneIndex, firstPart.partIndex)
          transitionDurationForRender = Math.max(partDuration, 1)
        }

        renderSceneContent(firstSceneIndexForRender, null, {
          skipAnimation: false,
          forceTransition: firstSceneForRender?.transition || 'none',
          updateTimeline: false,
          prepareOnly: false,
          isPlaying: true,
          transitionDuration: transitionDurationForRender,
          onComplete: () => {
            lastRenderedSceneIndexRef.current = firstSceneIndexForRender
          },
        })
      } else {
        lastRenderedSceneIndexRef.current = firstSceneIndexForRender
      }

      
      // 각 구간을 순차적으로 처리하는 함수
      const playPart = async (globalPartIndex: number): Promise<void> => {
        if (abortController.signal.aborted || !isPlayingRef.current) {
          return
        }

        if (globalPartIndex >= mergedTextParts.length) {
          return
        }

        const partInfo = mergedTextParts[globalPartIndex]
        const currentPartText = partInfo.text
        const targetSceneIndex = partInfo.sceneIndex
        const scenePartIndex = partInfo.partIndex
        const targetScene = updatedTimeline.scenes[targetSceneIndex]

        if (!currentPartText) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 씬이 변경되면 씬리스트 패널만 업데이트 (렌더링은 하지 않음)
        // setCurrentSceneIndex를 호출하면 다른 곳에서 렌더링이 트리거될 수 있으므로
        // currentSceneIndexRef만 업데이트하고 setCurrentSceneIndex는 호출하지 않음
        // 또한 이미지가 렌더링되지 않도록 모든 이미지를 숨김
        if (currentSceneIndexRef.current !== targetSceneIndex) {
          currentSceneIndexRef.current = targetSceneIndex
        }

        // 구간별 전환 효과 적용: 각 분할 씬의 transition을 그대로 사용
        if (renderSceneContent && targetScene) {
          // 같은 씬이 이미 렌더링되어 있고 보이는 상태라면 renderSceneContent를 호출하지 않음 (재렌더링 방지)
          const currentSprite = spritesRef.current.get(targetSceneIndex)
          const isAlreadyRendered = 
            lastRenderedSceneIndexRef.current === targetSceneIndex &&
            currentSprite?.visible &&
            currentSprite?.alpha === 1
          
          if (!isAlreadyRendered) {
            const isMovement = movements.some((m) => m.value === (targetScene.transition || ''))
            // 움직임: 해당 파트 TTS, 비움직임: 1초 고정
            const transitionDurationForRender = isMovement
              ? Math.max(getPartTtsDuration(targetSceneIndex, scenePartIndex), 1)
              : 1

            renderSceneContent(targetSceneIndex, null, {
              skipAnimation: false,
              forceTransition: targetScene.transition || 'none',
              previousIndex: lastRenderedSceneIndexRef.current ?? undefined,
              updateTimeline: false,
              prepareOnly: false,
              isPlaying: true,
              transitionDuration: transitionDurationForRender,
              onComplete: () => {
                lastRenderedSceneIndexRef.current = targetSceneIndex
              },
            })
          } else {
            // 이미 렌더링된 경우에도 lastRenderedSceneIndexRef 업데이트
            lastRenderedSceneIndexRef.current = targetSceneIndex
          }

          // 전환 중/전환 이후 이미지가 사라지는 것을 방지하기 위해 가시성 보정
          // 같은 그룹 내 씬인 경우 첫 번째 씬의 스프라이트를 사용
          let spriteToShow = spritesRef.current.get(targetSceneIndex)
          if (targetScene.sceneId !== undefined) {
            const firstSceneIndexInGroup = updatedTimeline.scenes.findIndex(
              (s) => s.sceneId === targetScene.sceneId
            )
            if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== targetSceneIndex) {
              const firstSprite = spritesRef.current.get(firstSceneIndexInGroup)
              if (firstSprite) {
                spriteToShow = firstSprite
              }
            }
          }

          if (spriteToShow && containerRef.current) {
            // 컨테이너에 없으면 추가 (필요한 경우에만)
            if (spriteToShow.parent !== containerRef.current) {
              if (spriteToShow.parent) {
                spriteToShow.parent.removeChild(spriteToShow)
              }
              containerRef.current.addChild(spriteToShow)
            }
            
            // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
            if (spriteToShow.parent === containerRef.current) {
              containerRef.current.setChildIndex(spriteToShow, 0)
            }
            
            // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
            // 씬이 넘어가지 않는다면 이미지가 그대로 남아있어야 함
            // 보이지 않는 경우에만 보이게 설정
            if (!spriteToShow.visible || spriteToShow.alpha < 1) {
              spriteToShow.visible = true
              spriteToShow.alpha = 1
            }
            
            // 필터 제거 (블러 등) - 항상 제거
            if (spriteToShow.filters && spriteToShow.filters.length > 0) {
              spriteToShow.filters = []
            }
            // 마스크 제거 (원형 등) - 항상 제거
            if (spriteToShow.mask) {
              spriteToShow.mask = null
            }
            
            // 텍스트 재렌더링하지 않음 (이미 보이는 상태라면 그대로 유지)

            // 텍스트는 setTimeout에서 처리하지 않음 (깜빡임 방지)
            // 텍스트는 전환 효과 시작 시와 완료 시에만 처리됨
          }
        }

        // 각 구간에서 텍스트 객체 찾기
        // 같은 그룹 내 씬들은 첫 번째 씬의 텍스트를 공유하므로, 항상 첫 번째 씬의 텍스트를 사용
        // textToUpdate는 이미 첫 번째 씬의 텍스트 객체이므로, 이를 직접 사용
        const currentTextToUpdate = textToUpdate
        
        // 자막 텍스트 업데이트
        // 위치는 renderSceneContent를 통해 이미 설정되었으므로, 텍스트와 스타일만 업데이트
        if (currentTextToUpdate && currentPartText) {
          // 텍스트 업데이트
          currentTextToUpdate.text = currentPartText
          
          // 해당 구간의 씬 설정으로 자막 스타일 업데이트
          if (targetScene?.text) {
            const fontFamily = resolveSubtitleFontFamily(targetScene.text.font)
            const fontWeight = targetScene.text.fontWeight ?? (targetScene.text.style?.bold ? 700 : 400)
            
            // 텍스트 너비 계산 (마스크 효과와 무관하게 일정 폭 유지)
            const stageWidth = containerRef.current?.width || 1080
            let textWidth = stageWidth
            if (targetScene.text.transform?.width) {
              textWidth = targetScene.text.transform.width / (targetScene.text.transform.scaleX || 1)
            }

            // 텍스트 스타일 업데이트
            const styleConfig: Record<string, unknown> = {
              fontFamily,
              fontSize: targetScene.text.fontSize || 80,
              fill: targetScene.text.color || '#ffffff',
              align: targetScene.text.style?.align || 'center',
              fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
              fontStyle: targetScene.text.style?.italic ? 'italic' : 'normal',
              wordWrap: true,
              wordWrapWidth: textWidth,
              breakWords: true,
              stroke: { color: '#000000', width: 10 },
            }
            
            const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
            currentTextToUpdate.style = textStyle

            // 밑줄 렌더링 (텍스트 자식으로 추가)
            const removeUnderline = () => {
              const underlineChildren = currentTextToUpdate.children.filter(
                (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
              )
              underlineChildren.forEach((child) => currentTextToUpdate.removeChild(child))
            }
            removeUnderline()
            if (targetScene.text.style?.underline) {
              requestAnimationFrame(() => {
                const underlineHeight = Math.max(2, (targetScene.text.fontSize || 80) * 0.05)
                const textColor = targetScene.text.color || '#ffffff'
                const colorValue = textColor.startsWith('#')
                  ? parseInt(textColor.slice(1), 16)
                  : 0xffffff

                const bounds = currentTextToUpdate.getLocalBounds()
                const underlineWidth = bounds.width || textWidth

                const underline = new PIXI.Graphics()
                ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

                const halfWidth = underlineWidth / 2
                const yPos = bounds.height / 2 + underlineHeight * 0.25 // 텍스트 하단 근처

                underline.lineStyle(underlineHeight, colorValue, 1)
                underline.moveTo(-halfWidth, yPos)
                underline.lineTo(halfWidth, yPos)
                underline.stroke()

                currentTextToUpdate.addChild(underline)
              })
            }

            // 위치는 renderSceneContent를 통해 이미 설정되었으므로 업데이트하지 않음
            // Transform이 있는 경우에만 업데이트 (사용자가 직접 설정한 경우)
            if (targetScene.text.transform) {
              const scaleX = targetScene.text.transform.scaleX ?? 1
              const scaleY = targetScene.text.transform.scaleY ?? 1
              currentTextToUpdate.x = targetScene.text.transform.x
              currentTextToUpdate.y = targetScene.text.transform.y
              currentTextToUpdate.scale.set(scaleX, scaleY)
              currentTextToUpdate.rotation = targetScene.text.transform.rotation ?? 0
            }
            // Transform이 없는 경우 위치는 renderSceneContent에서 설정한 것을 유지
          }
          
          // 텍스트가 컨테이너에 없으면 추가 (반드시 컨테이너에 있어야 표시됨)
          if (containerRef.current) {
            if (currentTextToUpdate.parent !== containerRef.current) {
              if (currentTextToUpdate.parent) {
                currentTextToUpdate.parent.removeChild(currentTextToUpdate)
              }
              containerRef.current.addChild(currentTextToUpdate)
            }
            // 컨테이너의 맨 위로 이동 (다른 요소에 가려지지 않도록)
            // 이미 맨 위가 아니면만 setChildIndex 호출 (깜빡임 방지)
            const currentIndex = containerRef.current.getChildIndex(currentTextToUpdate)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(currentTextToUpdate, maxIndex)
            }
          }
          
          // 텍스트 표시 (강제로 설정)
          currentTextToUpdate.visible = true
          currentTextToUpdate.alpha = 1
        }

        // 마크업 가져오기
        // TTS 캐시는 각 씬의 실제 자막으로 생성되므로, 각 씬의 buildSceneMarkup을 사용해야 함
        const markups = buildSceneMarkup(updatedTimeline, targetSceneIndex)
        if (scenePartIndex >= markups.length) {
          // 마크업이 없으면 다음 구간으로
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        const markup = markups[scenePartIndex]
        if (!markup) {
          // 마크업이 null이면 다음 구간으로
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 씬별 voiceTemplate 사용 (있으면 씬의 것을 사용, 없으면 전역 voiceTemplate 사용)
        const sceneVoiceTemplate = targetScene?.voiceTemplate || voiceTemplate
        if (!sceneVoiceTemplate) {
          // 음성 템플릿이 없으면 다음 구간으로 이동
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // TTS 파일 가져오기
        const key = makeTtsKey(sceneVoiceTemplate, markup)
        let cached = ttsCacheRef.current.get(key)

        if (!cached) {
          // 마크업으로 직접 검색
          for (const [, cacheValue] of ttsCacheRef.current.entries()) {
            if (cacheValue.markup === markup) {
              cached = cacheValue
              break
            }
          }
        }

        // TTS 캐시 찾기 실패 시 다음 구간으로
        if (!cached) {
          console.warn(`[useGroupPlayback] 구간 ${globalPartIndex + 1} TTS 캐시 없음, 다음 구간으로 이동`)
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // TTS 재생
        if (!cached || (!cached.url && !cached.blob)) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 오디오 정리
        cleanupAudio()

        // 오디오 URL 생성
        const audioUrl = cached.url || (cached.blob ? URL.createObjectURL(cached.blob) : null)
        if (!audioUrl) {
          if (globalPartIndex < mergedTextParts.length - 1) {
            await playPart(globalPartIndex + 1)
          }
          return
        }

        // 씬의 첫 구간에서 효과음 재생
        if (scenePartIndex === 0) {
          const scene = updatedTimeline.scenes[targetSceneIndex]
          if (scene.soundEffect) {
            const effectUrl = resolveSoundEffectUrl(scene.soundEffect)
            const seAudio = new Audio(effectUrl)
            seAudio.volume = 0.5
            seAudio.play().catch((err) => {
              console.warn('[useGroupPlayback] 효과음 재생 실패:', err)
            })
          }
        }

        ttsAudioUrlRef.current = audioUrl
        const audio = new Audio(audioUrl)
        audio.playbackRate = updatedTimeline?.playbackSpeed ?? 1.0
        ttsAudioRef.current = audio
        
        // 오디오 로드 대기 및 duration 확인
        if (audio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (audio.readyState >= 2) {
              resolve()
              return
            }
            
            const handleLoadedMetadata = () => {
              // 실제 오디오 duration 확인 및 캐시 업데이트
              if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
                const actualDuration = audio.duration
                const cachedDuration = cached.durationSec || 0
                
                // 실제 duration과 캐시된 duration이 0.1초 이상 차이나면 업데이트
                if (Math.abs(actualDuration - cachedDuration) > 0.1) {
                  console.log(`[useGroupPlayback] Duration 불일치 감지: 캐시=${cachedDuration.toFixed(2)}s, 실제=${actualDuration.toFixed(2)}s, 업데이트 중...`)
                  // 캐시 업데이트
                  ttsCacheRef.current.set(key, {
                    ...cached,
                    durationSec: actualDuration,
                  })
                }
              }
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            
            const handleCanPlay = () => {
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            const handleLoadError = () => {
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            
            // loadedmetadata 이벤트를 먼저 등록 (duration 정보 포함)
            audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true })
            audio.addEventListener('canplay', handleCanPlay, { once: true })
            audio.addEventListener('error', handleLoadError, { once: true })
            setTimeout(() => {
              audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }, 100)
          })
        } else {
          // 이미 로드된 경우에도 duration 확인
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            const actualDuration = audio.duration
            const cachedDuration = cached.durationSec || 0
            
            // 실제 duration과 캐시된 duration이 0.1초 이상 차이나면 업데이트
            if (Math.abs(actualDuration - cachedDuration) > 0.1) {
              console.log(`[useGroupPlayback] Duration 불일치 감지: 캐시=${cachedDuration.toFixed(2)}s, 실제=${actualDuration.toFixed(2)}s, 업데이트 중...`)
              // 캐시 업데이트
              ttsCacheRef.current.set(key, {
                ...cached,
                durationSec: actualDuration,
              })
            }
          }
        }

        // 오디오 재생 전에 텍스트가 표시되어 있는지 확인하고 다시 표시
        if (currentTextToUpdate && currentPartText) {
          if (containerRef.current && currentTextToUpdate.parent !== containerRef.current) {
            if (currentTextToUpdate.parent) {
              currentTextToUpdate.parent.removeChild(currentTextToUpdate)
            }
            containerRef.current.addChild(currentTextToUpdate)
          }
          currentTextToUpdate.visible = true
          currentTextToUpdate.alpha = 1
        }

        // 오디오 재생
        await new Promise<void>((resolve) => {
          if (abortController.signal.aborted) {
            resolve()
            return
          }

          let isResolved = false // 중복 resolve 방지
          
          const cleanup = () => {
            if (isResolved) return
            isResolved = true
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('pause', handlePause)
            audio.removeEventListener('timeupdate', handleTimeUpdate)
          }

          const handleEnded = () => {
            cleanup()
            
            // 오디오 재생 완료 후에도 텍스트가 표시되어 있는지 확인하고 다시 표시
            if (currentTextToUpdate && currentPartText) {
              if (containerRef.current && currentTextToUpdate.parent !== containerRef.current) {
                if (currentTextToUpdate.parent) {
                  currentTextToUpdate.parent.removeChild(currentTextToUpdate)
                }
                containerRef.current.addChild(currentTextToUpdate)
              }
              currentTextToUpdate.visible = true
              currentTextToUpdate.alpha = 1
            }
            resolve()
          }
          
          const handleError = () => {
            cleanup()
            resolve()
          }
          
          // pause 이벤트에서 즉시 정지 처리
          const handlePause = () => {
            if (abortController.signal.aborted || !isPlayingRef.current) {
              cleanup()
              resolve()
            }
          }
          
          // 재생 중에도 abort 체크 (timeupdate 이벤트 활용)
          const handleTimeUpdate = () => {
            if (abortController.signal.aborted || !isPlayingRef.current) {
              audio.pause()
              cleanup()
              resolve()
            }
          }
          
          audio.addEventListener('ended', handleEnded)
          audio.addEventListener('error', handleError)
          audio.addEventListener('pause', handlePause)
          audio.addEventListener('timeupdate', handleTimeUpdate) // 재생 중 체크 추가
          
          if (abortController.signal.aborted || !isPlayingRef.current) {
            cleanup()
            resolve()
            return
          }
          
          // 재생 시작
          try {
            const playPromise = audio.play()
            if (playPromise !== undefined) {
              playPromise
                .catch((error) => {
                  if (error.name !== 'AbortError' && !error.message?.includes('interrupted')) {
                    console.error('[useGroupPlayback] TTS 재생 시작 실패:', error)
                  }
                  handleError()
                })
            }
          } catch (error) {
            console.error('[useGroupPlayback] audio.play() 호출 실패:', error)
            handleError()
          }
        })

        // 다음 구간 재생 (현재 구간 재생 완료 후)
        if (globalPartIndex < mergedTextParts.length - 1) {
          await playPart(globalPartIndex + 1)
        } else {
          // 모든 구간 재생 완료 후 lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = targetSceneIndex
        }
      }
      
      // TTS 재생 시작
      if (mergedTextParts.length > 0) {
        await playPart(0)
      }
      
      // actualPlaybackDuration은 useFullPlayback에서 그룹 전체 재생 시간을 사용해서 설정하므로
      // 여기서는 설정하지 않음 (중복 방지)

    } catch {
      // 재생 실패 처리
    } finally {
      // 원래 transitionDuration 복원
      if (firstScene && originalTransitionDuration !== undefined) {
        const restoredTimeline = {
          ...timeline,
          scenes: timeline.scenes.map((scene, idx) =>
            idx === firstSceneIndex
              ? {
                  ...scene,
                  transitionDuration: originalTransitionDuration,
                }
              : scene
          ),
        }
        setTimeline(restoredTimeline)
      }
      
      // 그룹 재생이 끝나기 전에 마지막 씬의 이미지와 자막 유지
      const lastSceneIndex = groupIndices[groupIndices.length - 1]
      
      // 마지막 씬의 이미지와 자막이 이미 표시되어 있으므로, 다시 렌더링하지 않고 유지
      // 이미지가 끊기지 않도록 마지막 씬의 스프라이트와 텍스트만 확인하여 표시
      if (lastSceneIndex !== undefined) {
        const lastSprite = spritesRef.current.get(lastSceneIndex)
        const lastText = textsRef.current.get(lastSceneIndex)
        
        // 같은 그룹 내 첫 번째 씬의 스프라이트/텍스트 사용
        const lastScene = timeline.scenes[lastSceneIndex]
        let spriteToShow = lastSprite
        let textToShow = lastText
        
        if (lastScene?.sceneId !== undefined) {
          const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === lastScene.sceneId)
          if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== lastSceneIndex) {
            spriteToShow = spritesRef.current.get(firstSceneIndexInGroup) || spriteToShow
            textToShow = textsRef.current.get(firstSceneIndexInGroup) || textToShow
          }
        }
        
        // 이미지와 자막이 컨테이너에 있고 표시되어 있는지 확인
        if (spriteToShow && containerRef.current) {
          if (spriteToShow.parent !== containerRef.current) {
            if (spriteToShow.parent) {
              spriteToShow.parent.removeChild(spriteToShow)
            }
            containerRef.current.addChild(spriteToShow)
          }
          spriteToShow.visible = true
          spriteToShow.alpha = 1
        }
        
        if (textToShow && containerRef.current) {
          if (textToShow.parent !== containerRef.current) {
            if (textToShow.parent) {
              textToShow.parent.removeChild(textToShow)
            }
            containerRef.current.addChild(textToShow)
          }
          textToShow.visible = true
          textToShow.alpha = 1
        }
      }
      
      // 전체 재생 중이 아닐 때만 isPlayingRef를 false로 설정
      // 전체 재생 중에는 useFullPlayback에서 관리하므로 여기서는 변경하지 않음
      // isPlayingRef가 true로 유지되어 있으면 전체 재생 중인 것으로 간주
      // (전체 재생 중에는 useFullPlayback에서 groupPlaybackIsPlayingRef를 true로 유지)
      // 단, stopGroup이 호출된 경우는 예외 (명시적으로 정지)
      if (!isPlayingRef.current || isSingleScene) {
        // 전체 재생 중이 아니거나 단일 씬 재생인 경우에만 false로 설정
      isPlayingRef.current = false
      }
      
      // 단일 씬 재생인 경우 재생 중인 씬 인덱스 초기화
      if (isSingleScene) {
        setPlayingSceneIndex(null)
        playingSceneIndexRef.current = null
      } else {
        // 그룹 재생인 경우 재생 중인 그룹 sceneId 초기화
        setPlayingGroupSceneId(null)
        playingGroupSceneIdRef.current = null
      }
    }
  }, [
    timeline,
    voiceTemplate,
    buildSceneMarkup,
    makeTtsKey,
    ttsCacheRef,
    ttsAudioRef,
    ttsAudioUrlRef,
    ensureSceneTtsParam,
    renderSceneContent,
    setTimeline,
    currentSceneIndexRef,
    lastRenderedSceneIndexRef,
    textsRef,
    spritesRef,
    containerRef,
    isPlayingRef,
    findScenesToSynthesize,
    synthesizeAndCacheTts,
    calculateGroupTtsDuration,
    parseMergedTextParts,
    findTextObject,
    cleanupAudio,
    stopGroup,
    playingSceneIndexRef,
    getPartTtsDuration,
  ])

  return {
    playGroup,
    stopGroup,
    playingSceneIndex,
    playingGroupSceneId,
  }
}

