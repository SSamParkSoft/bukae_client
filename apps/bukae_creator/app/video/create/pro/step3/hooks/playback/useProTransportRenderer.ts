'use client'

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTransportState } from '@/hooks/video/renderer/transport/useTransportState'
import { useRenderLoop } from '@/hooks/video/renderer/playback/useRenderLoop'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { getVideoTimeInSelectionWithLoop, resolveProSceneAtTime } from '../../utils/proPlaybackUtils'

interface UseProTransportRendererParams {
  timeline: TimelineData | null
  scenes: ProStep3Scene[]
  pixiReady: boolean
  appRef: React.MutableRefObject<PIXI.Application | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  currentSceneIndexRef: React.MutableRefObject<number>
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number) => Promise<void>
  renderSubtitle: (sceneIndex: number, script: string) => void
}

interface RenderAtOptions {
  skipAnimation?: boolean
  forceSceneIndex?: number
  /** 타임라인 내용만 바뀐 경우에도 같은 t에서 다시 그리기 위해 사용 */
  forceRender?: boolean
}

const VIDEO_SYNC_SEEK_EPSILON_SEC = 0.08
const VIDEO_SEGMENT_END_EPSILON_SEC = 0.02

function hideSprite(sprite: PIXI.Sprite) {
  if (!sprite.destroyed) {
    sprite.visible = false
    sprite.alpha = 0
  }
}

function hideAllSprites(spritesMap: Map<number, PIXI.Sprite>) {
  spritesMap.forEach((sprite) => {
    hideSprite(sprite)
  })
}

function applySceneBaseTransform(
  sprite: PIXI.Sprite,
  scene: TimelineData['scenes'][number] | null | undefined,
  stageWidth: number,
  stageHeight: number
) {
  if (sprite.destroyed) {
    return
  }

  if (scene?.imageTransform) {
    sprite.x = scene.imageTransform.x
    sprite.y = scene.imageTransform.y
    sprite.width = scene.imageTransform.width
    sprite.height = scene.imageTransform.height
    sprite.rotation = scene.imageTransform.rotation ?? 0
    return
  }

  const textureWidth = sprite.texture?.width
  const textureHeight = sprite.texture?.height
  if (!textureWidth || !textureHeight || textureWidth <= 0 || textureHeight <= 0) {
    return
  }

  const fitted = calculateSpriteParams(
    textureWidth,
    textureHeight,
    stageWidth,
    stageHeight,
    scene?.imageFit ?? 'contain'
  )
  sprite.width = fitted.width
  sprite.height = fitted.height
  sprite.x = fitted.x + fitted.width / 2
  sprite.y = fitted.y + fitted.height / 2
  sprite.rotation = 0
}

/**
 * Pro 트랙용 Transport 기반 렌더러
 * 역할: 타임라인 시간 t를 씬/세그먼트 시간으로 해석해 프레임을 렌더링
 */
export function useProTransportRenderer({
  timeline,
  scenes,
  pixiReady,
  appRef,
  spritesRef,
  videoElementsRef,
  currentSceneIndexRef,
  loadVideoAsSprite,
  renderSubtitle,
}: UseProTransportRendererParams) {
  const transportHook = useTransport()
  const { transportState } = useTransportState({ transport: transportHook.transport })
  const renderAtRef = useRef<((tSec: number, options?: RenderAtOptions) => void) | undefined>(undefined)
  const lastRenderedTimeRef = useRef<number>(-1)
  const lastRenderedSceneIndexRef = useRef<number>(-1)
  const renderRequestIdRef = useRef(0)
  const pendingSceneLoadRef = useRef<Map<number, Promise<void>>>(new Map())

  const syncVideoPlaybackToTimeline = useCallback(
    (video: HTMLVideoElement, scene: ProStep3Scene, expectedVideoTime: number) => {
      if (video.readyState < 2) {
        return
      }

      const selectionStart = scene.selectionStartSeconds ?? 0
      const selectionEnd = scene.selectionEndSeconds ?? selectionStart
      const hasSelectionWindow = selectionEnd > selectionStart
      const reachedSegmentEnd =
        hasSelectionWindow && expectedVideoTime >= selectionEnd - VIDEO_SEGMENT_END_EPSILON_SEC

      const currentDrift = Math.abs(video.currentTime - expectedVideoTime)
      if (currentDrift > VIDEO_SYNC_SEEK_EPSILON_SEC) {
        video.currentTime = expectedVideoTime
      }

      if (!transportState.isPlaying || reachedSegmentEnd) {
        if (!video.paused) {
          video.pause()
        }
        if (Math.abs(video.currentTime - expectedVideoTime) > 0.01) {
          video.currentTime = expectedVideoTime
        }
        return
      }

      if (video.playbackRate !== transportState.playbackRate) {
        video.playbackRate = transportState.playbackRate
      }

      if (video.paused) {
        void video.play().catch(() => undefined)
      }
    },
    [transportState.isPlaying, transportState.playbackRate]
  )

  const ensureSceneLoaded = useCallback(
    (sceneIndex: number, scene: ProStep3Scene, videoTime: number): Promise<void> => {
      if (!scene.videoUrl) {
        return Promise.resolve()
      }

      const existingSprite = spritesRef.current.get(sceneIndex)
      if (existingSprite && !existingSprite.destroyed) {
        const existingVideo = videoElementsRef.current.get(sceneIndex)
        if (existingVideo && existingVideo.readyState >= 2 && Math.abs(existingVideo.currentTime - videoTime) > 0.1) {
          existingVideo.currentTime = videoTime
        }
        return Promise.resolve()
      }

      const pendingLoad = pendingSceneLoadRef.current.get(sceneIndex)
      if (pendingLoad) {
        return pendingLoad
      }

      // loadVideoAsSprite는 selectionStartSeconds를 받아서 비디오를 처음 로드할 때 seek합니다
      // 로드 후에는 syncVideoPlaybackToTimeline에서 videoTime으로 seek합니다
      const selectionStartSeconds = scene.selectionStartSeconds ?? 0
      const loadPromise = loadVideoAsSprite(sceneIndex, scene.videoUrl, selectionStartSeconds)
        .catch(() => undefined)
        .finally(() => {
          pendingSceneLoadRef.current.delete(sceneIndex)
        })
      pendingSceneLoadRef.current.set(sceneIndex, loadPromise)
      return loadPromise
    },
    [loadVideoAsSprite, spritesRef, videoElementsRef]
  )

  const renderAt = useCallback(
    (tSec: number, options?: RenderAtOptions) => {
      if (!pixiReady || !timeline || !appRef.current) {
        return
      }

      if (
        !options?.forceRender &&
        options?.forceSceneIndex === undefined &&
        Math.abs(tSec - lastRenderedTimeRef.current) < 0.01
      ) {
        return
      }

      const resolved = resolveProSceneAtTime(scenes, tSec, {
        forceSceneIndex: options?.forceSceneIndex,
      })
      if (!resolved) {
        hideAllSprites(spritesRef.current)
        videoElementsRef.current.forEach((video) => {
          if (!video.paused) {
            video.pause()
          }
        })
        return
      }

      const targetSceneIndex = resolved.sceneIndex
      const targetScene = scenes[targetSceneIndex]
      if (!targetScene) {
        return
      }

      if (!targetScene.videoUrl) {
        hideAllSprites(spritesRef.current)
        videoElementsRef.current.forEach((video) => {
          if (!video.paused) {
            video.pause()
          }
        })
        renderSubtitle(targetSceneIndex, targetScene.script ?? '')
        currentSceneIndexRef.current = targetSceneIndex
        lastRenderedSceneIndexRef.current = targetSceneIndex
        lastRenderedTimeRef.current = tSec
        return
      }

      const videoTime = getVideoTimeInSelectionWithLoop(
        targetScene,
        resolved.sceneTimeInSegment,
        targetScene.originalVideoDurationSeconds
      )
      const sceneChanged = lastRenderedSceneIndexRef.current !== targetSceneIndex

      const applyVisualState = () => {
        const sprite = spritesRef.current.get(targetSceneIndex)
        if (!sprite || sprite.destroyed) {
          return false
        }

        const app = appRef.current
        if (!app || !app.screen || app.screen.width <= 0 || app.screen.height <= 0) {
          return false
        }

        const timelineScene = timeline.scenes?.[targetSceneIndex]
        applySceneBaseTransform(sprite, timelineScene, app.screen.width, app.screen.height)
        sprite.visible = true
        sprite.alpha = 1

        spritesRef.current.forEach((s, index) => {
          if (index !== targetSceneIndex) {
            hideSprite(s)
          }
        })

        videoElementsRef.current.forEach((video, index) => {
          if (index !== targetSceneIndex && !video.paused) {
            video.pause()
          }
        })

        app.renderer.render(app.stage)
        return true
      }

      if (sceneChanged || options?.forceSceneIndex !== undefined) {
        // 씬 전환 순간에도 자막이 즉시 보이도록 비디오 로드 전 먼저 렌더링
        renderSubtitle(targetSceneIndex, targetScene.script ?? '')
        currentSceneIndexRef.current = targetSceneIndex
        const immediateVideo = videoElementsRef.current.get(targetSceneIndex)
        if (immediateVideo) {
          syncVideoPlaybackToTimeline(immediateVideo, targetScene, videoTime)
        }
        const appliedImmediately = applyVisualState()
        if (!appliedImmediately) {
          // 대상 씬 스프라이트가 아직 없다면 기존 씬 스프라이트를 숨겨 잘못된 프레임 노출을 방지
          spritesRef.current.forEach((sprite, index) => {
            if (index !== targetSceneIndex) {
              hideSprite(sprite)
            }
          })
        }
        const requestId = ++renderRequestIdRef.current

        void ensureSceneLoaded(targetSceneIndex, targetScene, videoTime).then(() => {
          if (requestId !== renderRequestIdRef.current) {
            return
          }
          const loadedVideo = videoElementsRef.current.get(targetSceneIndex)
          if (loadedVideo) {
            syncVideoPlaybackToTimeline(loadedVideo, targetScene, videoTime)
          }
          
          // 스프라이트가 준비될 때까지 약간의 지연 후 applyVisualState 호출
          // (비동기 로딩 완료 후 DOM 업데이트가 완료되기까지 시간이 필요할 수 있음)
          requestAnimationFrame(() => {
            if (requestId !== renderRequestIdRef.current) {
              return
            }
            const applied = applyVisualState()
            if (!applied) {
              console.warn('[renderAt] 스프라이트가 아직 준비되지 않음:', {
                sceneIndex: targetSceneIndex,
                spriteExists: !!spritesRef.current.get(targetSceneIndex),
                spriteDestroyed: spritesRef.current.get(targetSceneIndex)?.destroyed,
              })
            }
            // 로드가 실패했거나 스프라이트가 아직 없으면 다음 tick에서 재시도될 수 있게 유지
            lastRenderedSceneIndexRef.current = applied ? targetSceneIndex : -1
          })
        })
      } else {
        const currentSprite = spritesRef.current.get(targetSceneIndex)
        const currentVideo = videoElementsRef.current.get(targetSceneIndex)
        if (!currentSprite || currentSprite.destroyed || !currentVideo) {
          // 동일 씬에서 자원이 빠진 상태면 sceneChanged 경로로 다시 진입해 재로딩
          lastRenderedSceneIndexRef.current = -1
          renderSubtitle(targetSceneIndex, targetScene.script ?? '')
          return
        }

        if (currentVideo) {
          syncVideoPlaybackToTimeline(currentVideo, targetScene, videoTime)
        }
        // 동일 씬 내 시작 프레임에서도 자막이 누락되지 않도록 매 tick에서 자막 동기화
        renderSubtitle(targetSceneIndex, targetScene.script ?? '')
        const applied = applyVisualState()
        if (!applied) {
          lastRenderedSceneIndexRef.current = -1
        }
      }

      lastRenderedTimeRef.current = tSec
    },
    [
      appRef,
      currentSceneIndexRef,
      ensureSceneLoaded,
      pixiReady,
      renderSubtitle,
      syncVideoPlaybackToTimeline,
      scenes,
      spritesRef,
      timeline,
      videoElementsRef,
    ]
  )

  useEffect(() => {
    renderAtRef.current = renderAt
  }, [renderAt])

  useRenderLoop({
    transport: transportHook.transport,
    transportState,
    renderAt,
    playingSceneIndex: null,
    playingGroupSceneId: null,
  })

  return {
    transport: transportHook.transport,
    transportHook,
    transportState,
    renderAt,
    renderAtRef,
  }
}
