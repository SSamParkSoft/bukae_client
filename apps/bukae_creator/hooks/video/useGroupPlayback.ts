'use client'

import { useCallback} from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { useSceneStructureStore } from '@/store/useSceneStructureStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { useTtsResources } from './useTtsResources'

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
}: UseGroupPlaybackParams) {
  // TTS 리소스 가져오기
  const { ttsCacheRef, ttsAudioRef, ttsAudioUrlRef, stopTtsAudio } = useTtsResources()
  const { getSceneStructure } = useSceneStructureStore()

  // TTS 캐시 확인 및 필요한 씬 찾기
  const findScenesToSynthesize = useCallback((groupIndices: number[]): number[] => {
    const scenesToSynthesize: number[] = []
    for (const sceneIndex of groupIndices) {
      const markups = buildSceneMarkup(timeline, sceneIndex)
      const hasAllCache = markups.every(markup => {
        const key = makeTtsKey(voiceTemplate!, markup)
        const cached = ttsCacheRef.current.get(key)
        return cached && (cached.blob || cached.url)
      })
      if (!hasAllCache) {
        scenesToSynthesize.push(sceneIndex)
      }
    }
    return scenesToSynthesize
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

  // TTS 합성 및 캐시 저장
  const synthesizeAndCacheTts = useCallback(async (scenesToSynthesize: number[]): Promise<boolean> => {
    if (!ensureSceneTtsParam || scenesToSynthesize.length === 0) {
      return true
    }

    setIsPreparing?.(true)
    setIsTtsBootstrapping?.(true)

    try {
      for (const sceneIndex of scenesToSynthesize) {
        const result = await ensureSceneTtsParam(
          sceneIndex,
          undefined,
          changedScenesRef.current.has(sceneIndex)
        )
        
        const markups = buildSceneMarkup(timeline!, sceneIndex)
        for (let i = 0; i < result.parts.length; i++) {
          const part = result.parts[i]
          const partMarkup = markups[i]
          if (part && partMarkup) {
            const partKey = makeTtsKey(voiceTemplate!, partMarkup)
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
  const calculateGroupTtsDuration = useCallback((sceneId: number, groupIndices: number[]): number => {
    // 항상 최신 TTS 캐시에서 직접 계산하여 정확한 duration 보장
    let duration = 0
    if (voiceTemplate && timeline) {
      for (const sceneIndex of groupIndices) {
        const markups = buildSceneMarkup(timeline, sceneIndex)
        for (const markup of markups) {
          const key = makeTtsKey(voiceTemplate, markup)
          const cached = ttsCacheRef.current.get(key)
          if (cached?.durationSec) {
            duration += cached.durationSec
          }
        }
      }
    }
    return duration
  }, [timeline, voiceTemplate, buildSceneMarkup, makeTtsKey, ttsCacheRef])

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

  // 디버깅 함수: 중복 렌더링 확인
  const debugRenderState = useCallback((label: string, sceneIndex: number | null, partIndex?: number) => {
    if (sceneIndex === null) {
      console.log(`[그룹재생] ${label}`)
      return
    }
    
    // visible: true인 스프라이트/텍스트 개수 확인
    const visibleSprites = Array.from(spritesRef?.current.entries() || [])
      .filter(([, sprite]) => sprite?.visible && sprite?.alpha > 0)
      .map(([idx]) => idx)
    
    const visibleTexts = Array.from(textsRef.current.entries())
      .filter(([, text]) => text?.visible && text?.alpha > 0)
      .map(([idx]) => idx)
    
    const currentSprite = spritesRef?.current.get(sceneIndex)
    
    // 같은 그룹 내 씬들은 첫 번째 씬의 텍스트를 공유하므로, 텍스트 객체를 올바르게 찾기
    let currentText: PIXI.Text | null = null
    if (timeline) {
      const scene = timeline.scenes[sceneIndex]
      if (scene?.sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
        if (firstSceneIndexInGroup >= 0) {
          currentText = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }
      if (!currentText) {
        currentText = textsRef.current.get(sceneIndex) || null
      }
    }
    
    const partInfo = partIndex !== undefined ? ` Part ${partIndex}` : ''
    console.log(
      `[그룹재생] ${label} | Scene ${sceneIndex}${partInfo} | ` +
      `스프라이트: ${currentSprite?.visible && currentSprite?.alpha > 0 ? '표시' : '숨김'} | ` +
      `텍스트: ${currentText?.visible && currentText?.alpha > 0 ? '표시' : '숨김'} | ` +
      `표시 중인 스프라이트: [${visibleSprites.join(', ')}] | ` +
      `표시 중인 텍스트: [${visibleTexts.join(', ')}]`
    )
    
    // 중복 렌더링 경고
    if (visibleSprites.length > 1) {
      console.warn(`⚠️ 중복 스프라이트 감지! ${visibleSprites.length}개가 동시에 표시됨: [${visibleSprites.join(', ')}]`)
    }
    if (visibleTexts.length > 1) {
      console.warn(`⚠️ 중복 텍스트 감지! ${visibleTexts.length}개가 동시에 표시됨: [${visibleTexts.join(', ')}]`)
    }
  }, [spritesRef, textsRef, timeline])

  /**
   * 그룹 재생 함수
   */
  const playGroup = useCallback(async (sceneId: number, groupIndices: number[]) => {
    if (!timeline || !voiceTemplate || !ensureSceneTtsParam) {
      return
    }

    // 디버깅: 그룹 재생 시작
    console.log(`[그룹재생] 그룹 재생 시작 | SceneId ${sceneId} | 그룹 인덱스: [${groupIndices.join(', ')}]`)

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

    // 3. TTS Duration 계산 및 전환 효과 길이 설정
    const totalGroupTtsDuration = calculateGroupTtsDuration(sceneId, groupIndices)

    // 첫 번째 씬의 transitionDuration 업데이트
    const firstSceneIndex = groupIndices[0]
    const firstScene = timeline.scenes[firstSceneIndex]
    const originalTransitionDuration = firstScene?.transitionDuration
    
    let updatedTimeline = timeline
    if (firstScene && totalGroupTtsDuration > 0) {
      updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((scene, idx) =>
          idx === firstSceneIndex
            ? { ...scene, transitionDuration: totalGroupTtsDuration }
            : scene
        ),
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
      textsRef.current.forEach((text) => {
        if (text) {
          text.visible = false
          text.alpha = 0
        }
      })
      
      // 자막 파싱
      const mergedTextParts = parseMergedTextParts(groupIndices, updatedTimeline)
      if (mergedTextParts.length === 0) {
        return
      }

      // 텍스트 객체 찾기
      const textToUpdate = findTextObject(firstSceneIndex, updatedTimeline)
      
      // 텍스트가 컨테이너에 없으면 추가하고 표시
      if (textToUpdate && containerRef.current) {
        if (textToUpdate.parent !== containerRef.current) {
          if (textToUpdate.parent) {
            textToUpdate.parent.removeChild(textToUpdate)
          }
          containerRef.current.addChild(textToUpdate)
        }
        textToUpdate.visible = true
        textToUpdate.alpha = 1
      }
      
      if (renderSceneContent) {
        // 디버깅: 첫 번째 씬 렌더링 시작 전
        debugRenderState('첫 번째 씬 렌더링 시작 전', firstSceneIndexForRender)
        
        // 렌더링 경로 확인: 그룹 재생 시작에서 renderSceneContent 사용
        renderSceneContent(firstSceneIndexForRender, null, {
          skipAnimation: false,
          forceTransition: firstSceneForRender?.transition || 'none',
          updateTimeline: false,
          prepareOnly: false,
          isPlaying: true,
          transitionDuration: totalGroupTtsDuration,
          onComplete: () => {
            lastRenderedSceneIndexRef.current = firstSceneIndexForRender
            // 디버깅: 첫 번째 씬 렌더링 완료 후
            debugRenderState('첫 번째 씬 렌더링 완료 후', firstSceneIndexForRender)
          },
        })
        
        // 디버깅: 렌더링 호출 직후
        setTimeout(() => {
          debugRenderState('첫 번째 씬 렌더링 호출 직후', firstSceneIndexForRender)
        }, 100)
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

        // 디버깅: 구간 재생 시작
        debugRenderState(`구간 ${globalPartIndex + 1} 재생 시작`, targetSceneIndex, scenePartIndex)
        
        // 각 구간에서 텍스트 객체 찾기
        // 같은 그룹 내 씬들은 첫 번째 씬의 텍스트를 공유하므로, 항상 첫 번째 씬의 텍스트를 사용
        // textToUpdate는 이미 첫 번째 씬의 텍스트 객체이므로, 이를 직접 사용
        const currentTextToUpdate = textToUpdate
        
        // 자막 텍스트 업데이트
        if (currentTextToUpdate && currentPartText) {
          // 텍스트 업데이트
          currentTextToUpdate.text = currentPartText
          
          // 텍스트가 컨테이너에 없으면 추가 (반드시 컨테이너에 있어야 표시됨)
          if (containerRef.current) {
            if (currentTextToUpdate.parent !== containerRef.current) {
              if (currentTextToUpdate.parent) {
                currentTextToUpdate.parent.removeChild(currentTextToUpdate)
              }
              containerRef.current.addChild(currentTextToUpdate)
            }
            // 컨테이너의 맨 위로 이동 (다른 요소에 가려지지 않도록)
            containerRef.current.setChildIndex(currentTextToUpdate, containerRef.current.children.length - 1)
          }
          
          // 텍스트 표시 (강제로 설정)
          currentTextToUpdate.visible = true
          currentTextToUpdate.alpha = 1
          
          // 디버깅: 텍스트 업데이트 후
          debugRenderState(`구간 ${globalPartIndex + 1} 텍스트 업데이트 후`, targetSceneIndex, scenePartIndex)
          
          // 텍스트가 실제로 표시되는지 확인 및 로깅
          const isInContainer = containerRef.current && currentTextToUpdate.parent === containerRef.current
          const isVisible = currentTextToUpdate.visible && currentTextToUpdate.alpha > 0
          console.log(
            `[그룹재생] 구간 ${globalPartIndex + 1} 텍스트 상태 확인 | ` +
            `컨테이너에 있음: ${isInContainer}, ` +
            `표시됨: ${isVisible}, ` +
            `visible: ${currentTextToUpdate.visible}, ` +
            `alpha: ${currentTextToUpdate.alpha}, ` +
            `텍스트: "${currentPartText.substring(0, 30)}..."`
          )
          
          if (!isInContainer) {
            console.warn(`[그룹재생] 구간 ${globalPartIndex + 1} 텍스트가 컨테이너에 없습니다! 다시 추가합니다.`)
            if (containerRef.current) {
              if (currentTextToUpdate.parent) {
                currentTextToUpdate.parent.removeChild(currentTextToUpdate)
              }
              containerRef.current.addChild(currentTextToUpdate)
              containerRef.current.setChildIndex(currentTextToUpdate, containerRef.current.children.length - 1)
            }
          }
          
          if (!isVisible) {
            console.warn(`[그룹재생] 구간 ${globalPartIndex + 1} 텍스트가 숨김 상태입니다. 다시 표시합니다.`)
            currentTextToUpdate.visible = true
            currentTextToUpdate.alpha = 1
          }
        } else if (!currentTextToUpdate) {
          console.warn(`[그룹재생] 구간 ${globalPartIndex + 1} 텍스트 객체를 찾을 수 없습니다. targetSceneIndex: ${targetSceneIndex}`)
        } else if (!currentPartText) {
          console.warn(`[그룹재생] 구간 ${globalPartIndex + 1} 텍스트가 비어있습니다.`)
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

        // TTS 파일 가져오기
        const key = makeTtsKey(voiceTemplate, markup)
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

        ttsAudioUrlRef.current = audioUrl
        const audio = new Audio(audioUrl)
        audio.playbackRate = updatedTimeline?.playbackSpeed ?? 1.0
        ttsAudioRef.current = audio
        
        // 오디오 로드 대기
        if (audio.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (audio.readyState >= 2) {
              resolve()
              return
            }
            
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            const handleLoadError = () => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }
            
            audio.addEventListener('canplay', handleCanPlay, { once: true })
            audio.addEventListener('error', handleLoadError, { once: true })
            setTimeout(() => {
              audio.removeEventListener('canplay', handleCanPlay)
              audio.removeEventListener('error', handleLoadError)
              resolve()
            }, 100)
          })
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

          const cleanup = () => {
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('pause', handlePause)
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
          
          const handleError = (event?: Event) => {
            console.error('[useGroupPlayback] TTS 재생 오류:', event)
            cleanup()
            resolve()
          }
          
          const handlePause = () => {
            // pause 이벤트는 무시
          }
          
          audio.addEventListener('ended', handleEnded)
          audio.addEventListener('error', handleError)
          audio.addEventListener('pause', handlePause)
          
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

        // 디버깅: 구간 재생 완료
        debugRenderState(`구간 ${globalPartIndex + 1} 재생 완료`, targetSceneIndex, scenePartIndex)
        
        // 다음 구간 재생 (현재 구간 재생 완료 후)
        if (globalPartIndex < mergedTextParts.length - 1) {
          await playPart(globalPartIndex + 1)
        } else {
          // 모든 구간 재생 완료 후 lastRenderedSceneIndexRef 업데이트
          lastRenderedSceneIndexRef.current = targetSceneIndex
          // 디버깅: 모든 구간 재생 완료
          debugRenderState('모든 구간 재생 완료', targetSceneIndex)
        }
      }
      
      // TTS 재생 시작
      if (mergedTextParts.length > 0) {
        await playPart(0)
      }

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
      
      isPlayingRef.current = false
      
      // 디버깅: 그룹 재생 완료
      console.log(`[그룹재생] 그룹 재생 완료 | SceneId ${sceneId}`)
      debugRenderState('최종 상태', lastSceneIndex)
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
    debugRenderState,
  ])

  return {
    playGroup,
  }
}

