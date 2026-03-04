'use client'

import { useCallback, useRef, useEffect, useMemo } from 'react'
import * as PIXI from 'pixi.js'
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTransportState } from '@/hooks/video/renderer/transport/useTransportState'
import { useRenderLoop } from '@/hooks/video/renderer/playback/useRenderLoop'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { MotionEvaluator } from '@/hooks/video/effects/motion/MotionEvaluator'
import type { MotionConfig } from '@/hooks/video/effects/motion/types'
import { getPlayableScenes, getVideoTimeInSelectionWithLoop, resolveProSceneAtTime } from '../../utils/proPlaybackUtils'

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

type RuntimeTransitionSprite = PIXI.Sprite & {
  __proCircleMask?: PIXI.Graphics | null
  __proBlurFilter?: PIXI.BlurFilter | null
}

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
  stageHeight: number,
  sourceDimensions?: { width: number; height: number } | null
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

  const rawWidth = sourceDimensions?.width ?? sprite.texture?.width
  const rawHeight = sourceDimensions?.height ?? sprite.texture?.height
  const textureWidth =
    Number.isFinite(rawWidth) && (rawWidth as number) > 0
      ? (rawWidth as number)
      : 0
  const textureHeight =
    Number.isFinite(rawHeight) && (rawHeight as number) > 0
      ? (rawHeight as number)
      : 0
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

function applySceneMotion({
  sprite,
  motion,
  sceneTimeInSegment,
  sceneDuration,
}: {
  sprite: PIXI.Sprite
  motion: MotionConfig
  sceneTimeInSegment: number
  sceneDuration: number
}) {
  if (sprite.destroyed) {
    return
  }

  const safeSceneDuration =
    Number.isFinite(sceneDuration) && sceneDuration > 0
      ? sceneDuration
      : motion.durationSec > 0
        ? motion.durationSec
        : 1

  const isZoomMotion = motion.type === 'zoom-in' || motion.type === 'zoom-out'
  const baseDuration =
    isZoomMotion
      ? safeSceneDuration
      : Number.isFinite(motion.durationSec) && motion.durationSec > 0
        ? Math.min(motion.durationSec, safeSceneDuration)
        : safeSceneDuration

  const hasValidStart =
    Number.isFinite(motion.startSecInScene) && motion.startSecInScene >= 0
  const hasValidDuration =
    Number.isFinite(motion.durationSec) && motion.durationSec > 0

  const runtimeMotion: MotionConfig = {
    ...motion,
    startSecInScene: hasValidStart ? motion.startSecInScene : 0,
    durationSec: hasValidDuration
      ? motion.durationSec
      : Math.max(0.001, baseDuration),
  }

  const baseState = {
    x: sprite.x,
    y: sprite.y,
    scaleX: sprite.scale.x,
    scaleY: sprite.scale.y,
    rotation: sprite.rotation,
    alpha: sprite.alpha,
  }

  const result = MotionEvaluator.evaluate(sceneTimeInSegment, runtimeMotion, baseState)
  if (typeof result.x === 'number' && Number.isFinite(result.x)) {
    sprite.x = result.x
  }
  if (typeof result.y === 'number' && Number.isFinite(result.y)) {
    sprite.y = result.y
  }
  if (typeof result.scaleX === 'number' && Number.isFinite(result.scaleX)) {
    sprite.scale.x = result.scaleX
  }
  if (typeof result.scaleY === 'number' && Number.isFinite(result.scaleY)) {
    sprite.scale.y = result.scaleY
  }
  if (typeof result.rotation === 'number' && Number.isFinite(result.rotation)) {
    sprite.rotation = result.rotation
  }
  if (typeof result.alpha === 'number' && Number.isFinite(result.alpha)) {
    sprite.alpha = Math.max(0, Math.min(1, result.alpha))
  }
}

function syncVideoToFrame(video: HTMLVideoElement, expectedVideoTime: number) {
  if (video.readyState < 2) {
    return
  }

  if (!video.paused) {
    video.pause()
  }

  if (Math.abs(video.currentTime - expectedVideoTime) > 0.01) {
    video.currentTime = expectedVideoTime
  }
}

function clearTransitionArtifacts(
  sprite: PIXI.Sprite | null | undefined,
  options?: { keepCircleMask?: boolean; keepBlurFilter?: boolean }
) {
  if (!sprite || sprite.destroyed) {
    return
  }

  const runtime = sprite as RuntimeTransitionSprite

  if (!options?.keepCircleMask) {
    const mask = runtime.__proCircleMask
    if (mask) {
      if (sprite.mask === mask) {
        sprite.mask = null
      }
      if (mask.parent) {
        mask.parent.removeChild(mask)
      }
      if (!mask.destroyed) {
        mask.destroy()
      }
      runtime.__proCircleMask = null
    }
  }

  if (!options?.keepBlurFilter) {
    const blur = runtime.__proBlurFilter
    if (blur) {
      const currentFilters = sprite.filters ?? []
      const nextFilters = currentFilters.filter((filter) => filter !== blur)
      sprite.filters = nextFilters.length > 0 ? nextFilters : null
      blur.destroy()
      runtime.__proBlurFilter = null
    }
  }
}

function applySceneStartTransition({
  transitionType,
  progress,
  toSprite,
  fromSprite,
  stageWidth,
  stageHeight,
}: {
  transitionType: string
  progress: number
  toSprite: PIXI.Sprite
  fromSprite: PIXI.Sprite | null
  stageWidth: number
  stageHeight: number
}) {
  const clampedProgress = Math.max(0, Math.min(1, progress))
  const eased = 1 - Math.pow(1 - clampedProgress, 3)
  const normalized = transitionType.toLowerCase()

  clearTransitionArtifacts(toSprite, {
    keepCircleMask: normalized === 'circle',
    keepBlurFilter: normalized === 'blur',
  })
  clearTransitionArtifacts(fromSprite)

  const toBaseX = toSprite.x
  const toBaseY = toSprite.y
  const toBaseWidth = toSprite.width
  const toBaseHeight = toSprite.height
  const toBaseRotation = toSprite.rotation
  const fromBaseX = fromSprite?.x ?? 0
  const fromBaseY = fromSprite?.y ?? 0
  const fromBaseRotation = fromSprite?.rotation ?? 0
  const fromBaseWidth = fromSprite?.width ?? 0
  const fromBaseHeight = fromSprite?.height ?? 0

  toSprite.visible = true
  toSprite.alpha = 1

  if (fromSprite && !fromSprite.destroyed) {
    fromSprite.visible = true
    fromSprite.alpha = 1
    fromSprite.width = fromBaseWidth
    fromSprite.height = fromBaseHeight
  }

  switch (normalized) {
    case 'fade':
      toSprite.alpha = eased
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 1 - eased
      }
      break
    case 'slide-left': {
      const offset = Math.max(stageWidth, stageHeight) * 0.1
      toSprite.x = toBaseX + offset * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.x = fromBaseX - offset * eased
      }
      break
    }
    case 'slide-right': {
      const offset = Math.max(stageWidth, stageHeight) * 0.1
      toSprite.x = toBaseX - offset * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.x = fromBaseX + offset * eased
      }
      break
    }
    case 'slide-up': {
      const offset = Math.max(stageWidth, stageHeight) * 0.1
      toSprite.y = toBaseY + offset * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.y = fromBaseY - offset * eased
      }
      break
    }
    case 'slide-down': {
      const offset = Math.max(stageWidth, stageHeight) * 0.1
      toSprite.y = toBaseY - offset * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.y = fromBaseY + offset * eased
      }
      break
    }
    case 'zoom-in':
      toSprite.width = toBaseWidth * (0.5 + 0.5 * eased)
      toSprite.height = toBaseHeight * (0.5 + 0.5 * eased)
      toSprite.alpha = eased
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 1 - eased
      }
      break
    case 'zoom-out':
      toSprite.width = toBaseWidth * (1.5 - 0.5 * eased)
      toSprite.height = toBaseHeight * (1.5 - 0.5 * eased)
      toSprite.alpha = eased
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 1 - eased
      }
      break
    case 'rotate':
      // 공용 전환 로직과 동일하게 한 바퀴 회전하며 진입
      toSprite.rotation = toBaseRotation - Math.PI * 2 * (1 - eased)
      toSprite.alpha = eased
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.rotation = fromBaseRotation + Math.PI * 2 * eased
        fromSprite.alpha = 1 - eased
      }
      break
    case 'blur':
      toSprite.alpha = 1
      {
        const runtime = toSprite as RuntimeTransitionSprite
        if (!runtime.__proBlurFilter) {
          runtime.__proBlurFilter = new PIXI.BlurFilter()
        }
        const blurFilter = runtime.__proBlurFilter
        const filters = toSprite.filters ?? []
        if (!filters.includes(blurFilter)) {
          toSprite.filters = [...filters, blurFilter]
        }
        // 시작은 강한 블러, 끝으로 갈수록 선명
        blurFilter.blur = 30 * (1 - eased)
      }
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 1 - eased
      }
      break
    case 'glitch': {
      const jitter = (1 - eased) * 8 * Math.sin(clampedProgress * 40)
      toSprite.x = toBaseX + jitter
      toSprite.alpha = eased
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.x = fromBaseX - jitter
        fromSprite.alpha = 1 - eased
      }
      break
    }
    case 'circle':
      toSprite.alpha = 1
      {
        const runtime = toSprite as RuntimeTransitionSprite
        let mask = runtime.__proCircleMask
        if (!mask || mask.destroyed) {
          mask = new PIXI.Graphics()
          runtime.__proCircleMask = mask
        }
        const parent = toSprite.parent
        if (parent && mask.parent !== parent) {
          if (mask.parent) {
            mask.parent.removeChild(mask)
          }
          parent.addChild(mask)
          const spriteIndex = parent.getChildIndex(toSprite)
          parent.setChildIndex(mask, Math.max(0, spriteIndex))
        }
        const maxRadius = Math.sqrt(toBaseWidth * toBaseWidth + toBaseHeight * toBaseHeight) * 0.6
        const currentRadius = Math.max(0.001, maxRadius * eased)
        mask.clear()
        mask.beginFill(0xffffff, 1)
        mask.drawCircle(toBaseX, toBaseY, currentRadius)
        mask.endFill()
        toSprite.mask = mask
      }
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 1 - eased
      }
      break
    case 'none':
    default:
      toSprite.alpha = 1
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.alpha = 0
      }
      break
  }

  if (fromSprite && !fromSprite.destroyed && clampedProgress >= 0.999) {
    hideSprite(fromSprite)
  }

  if (clampedProgress >= 0.999) {
    clearTransitionArtifacts(toSprite)
  }
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
  const playableScenes = useMemo(() => getPlayableScenes(scenes), [scenes])

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
      const timelineScene = timeline.scenes?.[targetSceneIndex]
      const sceneTransition = (timelineScene?.transition ?? 'none').toLowerCase()
      const hasTransitionEffect = sceneTransition !== 'none'
      const transitionDuration = Math.max(0, timelineScene?.transitionDuration ?? 0.5)
      const previousPlayable = resolved.playableIndex > 0 ? playableScenes[resolved.playableIndex - 1] : null
      const previousSceneIndex = previousPlayable?.originalIndex ?? null
      const previousScene = previousSceneIndex !== null ? scenes[previousSceneIndex] : null
      const transitionProgress = transitionDuration > 0 ? resolved.sceneTimeInSegment / transitionDuration : 1
      const shouldTransition =
        hasTransitionEffect &&
        transitionDuration > 0 &&
        transitionProgress < 1

      const previousSprite = previousSceneIndex !== null ? spritesRef.current.get(previousSceneIndex) : null
      const canRenderCrossTransition =
        shouldTransition &&
        previousSceneIndex !== null &&
        !!previousSprite &&
        !previousSprite.destroyed

      const transitionStartVideoTime = getVideoTimeInSelectionWithLoop(
        targetScene,
        0,
        targetScene.originalVideoDurationSeconds
      )
      const targetVideoTimeForRender = shouldTransition ? transitionStartVideoTime : videoTime

      const previousSceneEndVideoTime =
        previousScene && previousPlayable
          ? getVideoTimeInSelectionWithLoop(
              previousScene,
              Math.max(0, previousPlayable.duration - VIDEO_SEGMENT_END_EPSILON_SEC),
              previousScene.originalVideoDurationSeconds
            )
          : null
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
        const targetVideo = videoElementsRef.current.get(targetSceneIndex)
        const targetSourceDimensions =
          targetVideo && targetVideo.videoWidth > 0 && targetVideo.videoHeight > 0
            ? { width: targetVideo.videoWidth, height: targetVideo.videoHeight }
            : null
        applySceneBaseTransform(
          sprite,
          timelineScene,
          app.screen.width,
          app.screen.height,
          targetSourceDimensions
        )
        sprite.visible = true
        sprite.alpha = 1

        const activePreviousSprite =
          previousSceneIndex !== null ? spritesRef.current.get(previousSceneIndex) : null

        if (canRenderCrossTransition && activePreviousSprite && !activePreviousSprite.destroyed && previousScene) {
          const previousTimelineScene = timeline.scenes?.[previousSceneIndex]
          const previousVideo = videoElementsRef.current.get(previousSceneIndex)
          const previousSourceDimensions =
            previousVideo && previousVideo.videoWidth > 0 && previousVideo.videoHeight > 0
              ? { width: previousVideo.videoWidth, height: previousVideo.videoHeight }
              : null
          applySceneBaseTransform(
            activePreviousSprite,
            previousTimelineScene ?? null,
            app.screen.width,
            app.screen.height,
            previousSourceDimensions
          )

          const targetContainer = (sprite.parent ?? activePreviousSprite.parent) as PIXI.Container | null
          if (!targetContainer) {
            return false
          }

          if (activePreviousSprite.parent !== targetContainer) {
            if (activePreviousSprite.parent) {
              activePreviousSprite.parent.removeChild(activePreviousSprite)
            }
            targetContainer.addChild(activePreviousSprite)
          }
          if (sprite.parent !== targetContainer) {
            if (sprite.parent) {
              sprite.parent.removeChild(sprite)
            }
            targetContainer.addChild(sprite)
          }

          targetContainer.setChildIndex(activePreviousSprite, 0)
          targetContainer.setChildIndex(sprite, targetContainer.children.length - 1)

          spritesRef.current.forEach((s, index) => {
            if (index !== targetSceneIndex && index !== previousSceneIndex) {
              hideSprite(s)
            }
          })

        } else {
          spritesRef.current.forEach((s, index) => {
            if (index !== targetSceneIndex) {
              hideSprite(s)
            }
          })
        }

        if (shouldTransition) {
          applySceneStartTransition({
            transitionType: sceneTransition,
            progress: transitionProgress,
            toSprite: sprite,
            fromSprite: canRenderCrossTransition ? activePreviousSprite ?? null : null,
            stageWidth: app.screen.width,
            stageHeight: app.screen.height,
          })
        }

        if (!options?.skipAnimation && !hasTransitionEffect && timelineScene?.motion) {
          applySceneMotion({
            sprite,
            motion: timelineScene.motion,
            sceneTimeInSegment: resolved.sceneTimeInSegment,
            sceneDuration: resolved.duration,
          })
        }

        videoElementsRef.current.forEach((video, index) => {
          const keepPreviousVideo = canRenderCrossTransition && previousSceneIndex !== null && index === previousSceneIndex
          if (index !== targetSceneIndex && !keepPreviousVideo && !video.paused) {
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
          if (shouldTransition) {
            syncVideoToFrame(immediateVideo, targetVideoTimeForRender)
          } else {
            syncVideoPlaybackToTimeline(immediateVideo, targetScene, targetVideoTimeForRender)
          }
        }
        if (canRenderCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
          const immediatePreviousVideo = videoElementsRef.current.get(previousSceneIndex)
          if (immediatePreviousVideo) {
            syncVideoToFrame(immediatePreviousVideo, previousSceneEndVideoTime)
          }
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
          if (canRenderCrossTransition && previousSceneIndex !== null && previousScene && previousSceneEndVideoTime !== null) {
            void ensureSceneLoaded(previousSceneIndex, previousScene, previousSceneEndVideoTime)
          }
          const loadedVideo = videoElementsRef.current.get(targetSceneIndex)
          if (loadedVideo) {
            if (shouldTransition) {
              syncVideoToFrame(loadedVideo, targetVideoTimeForRender)
            } else {
              syncVideoPlaybackToTimeline(loadedVideo, targetScene, targetVideoTimeForRender)
            }
          }
          if (canRenderCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
            const loadedPreviousVideo = videoElementsRef.current.get(previousSceneIndex)
            if (loadedPreviousVideo) {
              syncVideoToFrame(loadedPreviousVideo, previousSceneEndVideoTime)
            }
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
          if (shouldTransition) {
            syncVideoToFrame(currentVideo, targetVideoTimeForRender)
          } else {
            syncVideoPlaybackToTimeline(currentVideo, targetScene, targetVideoTimeForRender)
          }
        }
        if (canRenderCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
          const previousVideo = videoElementsRef.current.get(previousSceneIndex)
          if (previousVideo) {
            syncVideoToFrame(previousVideo, previousSceneEndVideoTime)
          }
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
      playableScenes,
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
