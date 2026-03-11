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
import { getTransitionFrameState } from '../../utils/transitionFrameState'

interface UseProTransportRendererParams {
  timeline: TimelineData | null
  scenes: ProStep3Scene[]
  pixiReady: boolean
  appRef: React.MutableRefObject<PIXI.Application | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  currentSceneIndexRef: React.MutableRefObject<number>
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number) => Promise<void>
  loadImageAsSprite?: (sceneIndex: number, imageUrl: string) => Promise<void>
  renderSubtitle: (sceneIndex: number, script: string) => void
  sceneLoadingStateRef: React.MutableRefObject<Map<number, LoadingState>>
}

export interface RenderAtOptions {
  skipAnimation?: boolean
  forceSceneIndex?: number
  /** 타임라인 내용만 바뀐 경우에도 같은 t에서 다시 그리기 위해 사용 */
  forceRender?: boolean
  /** 전환 효과를 강제로 완료 상태로 렌더링 (씬 카드 클릭 시 사용) */
  forceTransitionComplete?: boolean
}

const VIDEO_SYNC_SEEK_EPSILON_SEC = 0.08
const VIDEO_SEGMENT_END_EPSILON_SEC = 0.02
const SLIDE_TRANSITIONS = new Set([
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
])
const MOVEMENT_TRANSITIONS = new Set([
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
  'zoom-in',
  'zoom-out',
])

// 스프라이트 로딩 상태 타입
type LoadingStateStatus = 'not-loaded' | 'loading' | 'ready' | 'failed'

interface LoadingState {
  status: LoadingStateStatus
  timestamp: number
  videoReady: boolean
  spriteReady: boolean
}

// 사전 로딩 버퍼 시간 (전환 시작 N초 전부터 로드 시작)
const PRELOAD_BUFFER_TIME_SEC = 2.5 // 더 많은 버퍼 시간으로 증가
// 사전 로딩 체크 간격 (ms)
const PRELOAD_CHECK_INTERVAL_MS = 200

type RuntimeTransitionSprite = PIXI.Sprite & {
  __proCircleMask?: PIXI.Graphics | null
  __proBlurFilter?: PIXI.BlurFilter | null
}

type SpriteBaseState = {
  x: number
  y: number
  width: number
  height: number
  rotation: number
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

// 스프라이트 로딩 상태 확인 유틸리티
function isSpriteReady(
  loadingState: LoadingState | undefined,
  sprite: PIXI.Sprite | undefined
): boolean {
  if (!sprite || sprite.destroyed) {
    return false
  }

  // 로딩 상태가 정의되지 않았거나 'ready'가 아닌 경우 false 반환
  if (!loadingState || loadingState.status !== 'ready') {
    return false
  }

  // 비디오와 스프라이트 모두 준비되었는지 확인
  return loadingState.videoReady && loadingState.spriteReady
}

// 로딩 상태 초기화/업데이트 유틸리티
function updateLoadingState(
  sceneIndex: number,
  loadingStateRef: React.MutableRefObject<Map<number, LoadingState>>,
  updates: Partial<LoadingState>
): void {
  const current = loadingStateRef.current.get(sceneIndex) ?? {
    status: 'not-loaded',
    timestamp: Date.now(),
    videoReady: false,
    spriteReady: false,
  }

  loadingStateRef.current.set(sceneIndex, {
    ...current,
    ...updates,
    timestamp: Date.now(),
  })
}

// 현재 시점에서 전환 예상되는 씬들 식별
function getUpcomingScenes(
  currentSceneIndex: number,
  scenes: ProStep3Scene[],
  _currentTimeSec: number,
  _bufferTimeSec: number,
  sceneLoadingStateRef: React.MutableRefObject<Map<number, LoadingState>>
): number[] {
  const upcomingScenes: number[] = []

  // 현재 씬의 다음 씬들 확인 (최대 3개)
  for (let i = 1; i <= 3; i++) {
    const nextSceneIndex = currentSceneIndex + i
    if (nextSceneIndex >= scenes.length) {
      break
    }

    const nextScene = scenes[nextSceneIndex]
    if (!nextScene || !nextScene.videoUrl) {
      continue
    }

    // 이미 로드된 씬은 제외
    const loadState = sceneLoadingStateRef.current?.get(nextSceneIndex)
    if (loadState?.status === 'ready') {
      continue
    }

    upcomingScenes.push(nextSceneIndex)
  }

  return upcomingScenes
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

  const runtimeMotion: MotionConfig = {
    ...motion,
    // 움직임은 씬 시작 프레임부터 즉시 적용
    startSecInScene: 0,
    durationSec: Math.max(0.001, baseDuration),
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
  fromBaseState,
  stageWidth,
  stageHeight,
  forceComplete = false,
}: {
  transitionType: string
  progress: number
  toSprite: PIXI.Sprite
  fromSprite: PIXI.Sprite | null | undefined
  fromBaseState?: SpriteBaseState | null
  stageWidth: number
  stageHeight: number
  forceComplete?: boolean
}) {
  const effectiveProgress = forceComplete ? 1 : Math.max(0, Math.min(1, progress))
  const eased = 1 - Math.pow(1 - effectiveProgress, 3)
  const clampedProgress = effectiveProgress
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
  const fromBaseX = fromBaseState?.x ?? fromSprite?.x ?? 0
  const fromBaseY = fromBaseState?.y ?? fromSprite?.y ?? 0
  const fromBaseRotation = fromBaseState?.rotation ?? fromSprite?.rotation ?? 0
  const fromBaseWidth = fromBaseState?.width ?? fromSprite?.width ?? 0
  const fromBaseHeight = fromBaseState?.height ?? fromSprite?.height ?? 0
  const hasFromSprite = !!fromSprite && !fromSprite.destroyed
  const pushOffsetX = hasFromSprite
    ? Math.max(1, (toBaseWidth + fromBaseWidth) / 2)
    : Math.max(1, stageWidth)
  const pushOffsetY = hasFromSprite
    ? Math.max(1, (toBaseHeight + fromBaseHeight) / 2)
    : Math.max(1, stageHeight)

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
      toSprite.x = toBaseX + pushOffsetX * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.x = fromBaseX - pushOffsetX * eased
      }
      break
    }
    case 'slide-right': {
      toSprite.x = toBaseX - pushOffsetX * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.x = fromBaseX + pushOffsetX * eased
      }
      break
    }
    case 'slide-up': {
      toSprite.y = toBaseY + pushOffsetY * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.y = fromBaseY - pushOffsetY * eased
      }
      break
    }
    case 'slide-down': {
      toSprite.y = toBaseY - pushOffsetY * (1 - eased)
      if (fromSprite && !fromSprite.destroyed) {
        fromSprite.y = fromBaseY + pushOffsetY * eased
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
  loadImageAsSprite,
  renderSubtitle,
  sceneLoadingStateRef,
  cleanupSceneResources,
}: UseProTransportRendererParams & { cleanupSceneResources: (sceneIndex: number) => void }) {
  const transportHook = useTransport()
  const { transportState } = useTransportState({ transport: transportHook.transport })
  const renderAtRef = useRef<((tSec: number, options?: RenderAtOptions) => void) | undefined>(undefined)
  const lastRenderedTimeRef = useRef<number>(-1)
  const lastRenderedSceneIndexRef = useRef<number>(-1)
  const renderRequestIdRef = useRef(0)
  const pendingSceneLoadRef = useRef<Map<number, Promise<void>>>(new Map())
  const activeMovementTransitionKeyRef = useRef<string | null>(null)
  const movementTransitionFromBaseStateRef = useRef<{ key: string; state: SpriteBaseState } | null>(null)
  const transitionDebugPairRef = useRef<string | null>(null)
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

  // 사전 로딩 로직: 전환 예상 시점 이전에 관련 씬들 미리 로드
  const preloadScenesForTransition = useCallback(
    (currentTimeSec: number, currentSceneIndex: number) => {
      if (!pixiReady) {
        return
      }

      const upcomingScenes = getUpcomingScenes(
        currentSceneIndex,
        scenes,
        currentTimeSec,
        PRELOAD_BUFFER_TIME_SEC,
        sceneLoadingStateRef
      )

      // 전환을 위한 이전 씬 확인
      const previousPlayable = currentSceneIndex > 0 ? playableScenes[currentSceneIndex - 1] : null
      const previousSceneIndex = previousPlayable?.originalIndex ?? null

      if (previousSceneIndex !== null) {
        const previousScene = scenes[previousSceneIndex]
        if (previousScene?.videoUrl) {
          const loadState = sceneLoadingStateRef.current.get(previousSceneIndex)
          if (!loadState || loadState.status !== 'ready') {
            // 이전 씬도 미리 로드
            updateLoadingState(previousSceneIndex, sceneLoadingStateRef, {
              status: 'loading',
            })
            const selectionStartSeconds = previousScene.selectionStartSeconds ?? 0
            void loadVideoAsSprite(previousSceneIndex, previousScene.videoUrl, selectionStartSeconds)
              .then(() => {
                updateLoadingState(previousSceneIndex, sceneLoadingStateRef, {
                  status: 'ready',
                  videoReady: true,
                  spriteReady: true,
                })
              })
              .catch(() => {
                updateLoadingState(previousSceneIndex, sceneLoadingStateRef, {
                  status: 'failed',
                })
              })
          }
        }
      }

      // 다음 씬들 미리 로드
      upcomingScenes.forEach((sceneIndex) => {
        const scene = scenes[sceneIndex]
        if (!scene?.videoUrl) {
          return
        }

        const loadState = sceneLoadingStateRef.current.get(sceneIndex)
        if (loadState?.status === 'loading' || loadState?.status === 'ready') {
          return
        }

        updateLoadingState(sceneIndex, sceneLoadingStateRef, {
          status: 'loading',
        })

        const selectionStartSeconds = scene.selectionStartSeconds ?? 0
        void loadVideoAsSprite(sceneIndex, scene.videoUrl, selectionStartSeconds)
          .then(() => {
            updateLoadingState(sceneIndex, sceneLoadingStateRef, {
              status: 'ready',
              videoReady: true,
              spriteReady: true,
            })
          })
          .catch(() => {
            updateLoadingState(sceneIndex, sceneLoadingStateRef, {
              status: 'failed',
            })
          })
      })
    },
    [pixiReady, scenes, playableScenes, loadVideoAsSprite, sceneLoadingStateRef]
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

      // 이미지인 경우 이미지 로드
      if (targetScene.imageUrl && !targetScene.videoUrl) {
        if (!loadImageAsSprite) {
          return
        }

        const imageTimelineScene = timeline.scenes?.[targetSceneIndex]
        const imageConfiguredTransition = (imageTimelineScene?.transition ?? 'none').toLowerCase()
        const imageMotionType = imageTimelineScene?.motion?.type?.toLowerCase()
        const imageTransitionFromMotion =
          imageConfiguredTransition === 'none' && !!imageMotionType && SLIDE_TRANSITIONS.has(imageMotionType)
        const imageEffectiveTransition = imageTransitionFromMotion ? imageMotionType : imageConfiguredTransition
        const imageHasTransitionEffect = imageEffectiveTransition !== 'none'
        const imageConfiguredDuration = Math.max(0, imageTimelineScene?.transitionDuration ?? 0.5)
        const imageTransitionDuration = imageTransitionFromMotion
          ? imageConfiguredDuration > 0 ? imageConfiguredDuration : 0.5
          : imageConfiguredDuration
        const imagePreviousPlayable = resolved.playableIndex > 0 ? playableScenes[resolved.playableIndex - 1] : null
        const imagePreviousSceneIndex = imagePreviousPlayable?.originalIndex ?? null
        const imageTransitionRelativeTime =
          options?.forceSceneIndex !== undefined ? resolved.sceneTimeInSegment : tSec - resolved.sceneStartTime
        const imageTransitionState = getTransitionFrameState({
          hasTransitionEffect: imageHasTransitionEffect,
          transitionDurationSec: imageTransitionDuration,
          relativeTimeSec: imageTransitionRelativeTime,
        })
        const imageTransitionProgress = imageTransitionState.progress
        const imageShouldTransition = imageTransitionState.shouldTransition

        // 이전 씬의 리소스 정리 (씬 전환 중이 아닐 때만)
        if (!imageShouldTransition && lastRenderedSceneIndexRef.current !== null && lastRenderedSceneIndexRef.current !== targetSceneIndex) {
          if (typeof cleanupSceneResources === 'function') {
            cleanupSceneResources(lastRenderedSceneIndexRef.current)
          }
        }
        videoElementsRef.current.forEach((video) => {
          if (!video.paused) {
            video.pause()
          }
        })
        renderSubtitle(targetSceneIndex, targetScene.script ?? '')
        currentSceneIndexRef.current = targetSceneIndex
        lastRenderedSceneIndexRef.current = targetSceneIndex
        lastRenderedTimeRef.current = tSec

        const existingImageSprite = spritesRef.current.get(targetSceneIndex)
        const imageLoadState = sceneLoadingStateRef.current.get(targetSceneIndex)
        const isImageAlreadyLoaded =
          !!existingImageSprite && !existingImageSprite.destroyed && imageLoadState?.status === 'ready'

        if (isImageAlreadyLoaded) {
          const app = appRef.current
          if (!app || !app.screen) return

          applySceneBaseTransform(existingImageSprite, imageTimelineScene, app.screen.width, app.screen.height)

          if (imageShouldTransition) {
            const effectiveProgress = options?.forceTransitionComplete ? 1 : imageTransitionProgress
            const activePreviousSprite =
              imagePreviousSceneIndex !== null ? spritesRef.current.get(imagePreviousSceneIndex) : undefined

            spritesRef.current.forEach((s, index) => {
              if (index !== targetSceneIndex && index !== imagePreviousSceneIndex) {
                hideSprite(s)
              }
            })

            applySceneStartTransition({
              transitionType: imageEffectiveTransition,
              progress: effectiveProgress,
              toSprite: existingImageSprite,
              fromSprite: activePreviousSprite ?? null,
              stageWidth: app.screen.width,
              stageHeight: app.screen.height,
              forceComplete: options?.forceTransitionComplete,
            })

            if (effectiveProgress >= 1 && activePreviousSprite && !activePreviousSprite.destroyed) {
              hideSprite(activePreviousSprite)
              clearTransitionArtifacts(existingImageSprite)
            }
          } else {
            hideAllSprites(spritesRef.current)
            existingImageSprite.visible = true
            existingImageSprite.alpha = 1
          }

          app.renderer.render(app.stage)
        } else if (!imageLoadState || (imageLoadState.status !== 'loading' && imageLoadState.status !== 'ready')) {
          // 로딩 중이 아닐 때만 로드 시작 (중복 로드 방지)
          hideAllSprites(spritesRef.current)

          const requestId = ++renderRequestIdRef.current
          const initialTime = tSec

          void loadImageAsSprite(targetSceneIndex, targetScene.imageUrl)
            .then(() => {
              // 이 사이에 다른 renderAt 호출이 들어왔으면 무시
              if (requestId !== renderRequestIdRef.current) {
                return
              }

              const rerender = renderAtRef.current
              if (!rerender) {
                return
              }

              // 현재 타임라인 시간 기준으로 다시 렌더링
              const currentT =
                transportHook.transport?.getTime() ?? initialTime

              rerender(currentT, {
                forceSceneIndex: targetSceneIndex,
                forceRender: true,
                // 씬 카드 클릭에서 들어온 경우에는 이미 forceTransitionComplete 옵션이 전달됨
                forceTransitionComplete: options?.forceTransitionComplete,
              })
            })
            .catch(() => {
              // 로딩 실패 시에도 다음 프레임에서 재시도됨
            })
        }
        return
      }

      // 비디오도 없고 이미지도 없는 경우 처리 (아무것도 업로드되지 않은 씬)
      if (!targetScene.videoUrl && !targetScene.imageUrl) {
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
      const configuredTransition = (timelineScene?.transition ?? 'none').toLowerCase()
      const motionType = timelineScene?.motion?.type?.toLowerCase()
      const transitionFromMotion =
        configuredTransition === 'none' &&
        !!motionType &&
        SLIDE_TRANSITIONS.has(motionType)
      const effectiveTransition = transitionFromMotion ? motionType : configuredTransition
      const hasTransitionEffect = effectiveTransition !== 'none'
      const configuredDuration = Math.max(0, timelineScene?.transitionDuration ?? 0.5)
      const transitionDuration = transitionFromMotion
        ? configuredDuration > 0
          ? configuredDuration
          : 0.5
        : configuredDuration
      const previousPlayable = resolved.playableIndex > 0 ? playableScenes[resolved.playableIndex - 1] : null
      const previousSceneIndex = previousPlayable?.originalIndex ?? null
      const previousScene = previousSceneIndex !== null ? scenes[previousSceneIndex] : undefined
      const transitionRelativeTime =
        options?.forceSceneIndex !== undefined
          ? resolved.sceneTimeInSegment
          : tSec - resolved.sceneStartTime
      const transitionState = getTransitionFrameState({
        hasTransitionEffect,
        transitionDurationSec: transitionDuration,
        relativeTimeSec: transitionRelativeTime,
      })
      const transitionProgress = transitionState.progress
      const shouldTransition = transitionState.shouldTransition

      const needsCrossTransition =
        shouldTransition &&
        previousSceneIndex !== null &&
        !!previousScene
      if (!shouldTransition) {
        activeMovementTransitionKeyRef.current = null
        movementTransitionFromBaseStateRef.current = null
        transitionDebugPairRef.current = null
      }

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
      if (sceneChanged) {
        // 씬 전환 시 로딩 상태 초기화 (이전 씬에 대한 로딩 정보는 유지)
        const currentLoadingState = sceneLoadingStateRef.current.get(targetSceneIndex)
        if (!currentLoadingState || currentLoadingState.status !== 'ready') {
          updateLoadingState(targetSceneIndex, sceneLoadingStateRef, {
            status: 'not-loaded',
            videoReady: false,
            spriteReady: false,
          })
        }
      }

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
          previousSceneIndex !== null ? spritesRef.current.get(previousSceneIndex) : undefined

        // 이전 스프라이트의 로딩 상태 확인
        const previousLoadingState =
          previousSceneIndex !== null ? sceneLoadingStateRef.current.get(previousSceneIndex) : undefined
        const isPreviousSpriteReady = isSpriteReady(previousLoadingState, activePreviousSprite)

        const canRenderCrossTransitionNow =
          needsCrossTransition &&
          isPreviousSpriteReady &&
          !!activePreviousSprite &&
          !activePreviousSprite.destroyed
        const transitionPairKey =
          previousSceneIndex !== null ? `${previousSceneIndex}->${targetSceneIndex}` : null

        if (
          needsCrossTransition &&
          !canRenderCrossTransitionNow &&
          previousSceneIndex !== null &&
          previousScene &&
          previousSceneEndVideoTime !== null
        ) {
          void ensureSceneLoaded(previousSceneIndex, previousScene, previousSceneEndVideoTime)
        }

        const transitionDebugToken = transitionPairKey ?? `none->${targetSceneIndex}`
        if (shouldTransition && transitionDebugPairRef.current !== transitionDebugToken) {
          transitionDebugPairRef.current = transitionDebugToken
        }

        if (canRenderCrossTransitionNow && activePreviousSprite && previousScene) {
          const isMovementTransition = MOVEMENT_TRANSITIONS.has(effectiveTransition)
          if (!isMovementTransition) {
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
            activeMovementTransitionKeyRef.current = null
            movementTransitionFromBaseStateRef.current = null
          } else if (transitionPairKey) {
            if (activeMovementTransitionKeyRef.current !== transitionPairKey) {
              // Movement transition은 이전 씬의 직전 상태를 고정해 "한 프레임 되돌아감"을 방지한다.
              activeMovementTransitionKeyRef.current = transitionPairKey
              movementTransitionFromBaseStateRef.current = {
                key: transitionPairKey,
                state: {
                  x: activePreviousSprite.x,
                  y: activePreviousSprite.y,
                  width: activePreviousSprite.width,
                  height: activePreviousSprite.height,
                  rotation: activePreviousSprite.rotation,
                },
              }
            }
          }

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
          // fromSprite가 준비되지 않았으면 전환을 지연 (깜빡거림 방지)
          const fromSpriteToUse = canRenderCrossTransitionNow ? activePreviousSprite ?? null : null
          const effectiveProgress = options?.forceTransitionComplete ? 1 : transitionProgress

          // 크로스 전환이 필요하지만 스프라이트가 준비되지 않았으면 전환을 건너뜀
          if (!(needsCrossTransition && !canRenderCrossTransitionNow)) {
            // 전환 중에는 현재 씬 비디오 일시정지
            const currentVideo = videoElementsRef.current.get(targetSceneIndex)
            if (currentVideo && !currentVideo.paused) {
              syncVideoToFrame(currentVideo, targetVideoTimeForRender)
            }

            applySceneStartTransition({
              transitionType: effectiveTransition,
              progress: effectiveProgress,
              toSprite: sprite,
              fromSprite: fromSpriteToUse,
              fromBaseState:
                transitionPairKey &&
                movementTransitionFromBaseStateRef.current?.key === transitionPairKey
                  ? movementTransitionFromBaseStateRef.current.state
                  : null,
              stageWidth: app.screen.width,
              stageHeight: app.screen.height,
              forceComplete: options?.forceTransitionComplete,
            })
          }
        }

        // Cleanup transition artifacts when transition is complete (progress >= 1),
        // so cleanup runs even if frames skipped past the internal progress >= 0.999 check.
        const effectiveProgress = options?.forceTransitionComplete ? 1 : transitionProgress
        if (hasTransitionEffect && effectiveProgress >= 1) {
          clearTransitionArtifacts(sprite)
          if (canRenderCrossTransitionNow && activePreviousSprite && !activePreviousSprite.destroyed) {
            hideSprite(activePreviousSprite)
          }
          // 이전/현재 비디오 재생 복구는 렌더 루프(shouldTransition=false 프레임)가 처리:
          // - 이전 씬 비디오: 복구 불필요 (숨김 처리)
          // - 현재 씬 비디오: 다음 renderAt 호출에서 올바른 videoTime으로 syncVideoPlaybackToTimeline
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
          if (shouldTransition) {
            syncVideoToFrame(immediateVideo, targetVideoTimeForRender)
          } else {
            syncVideoPlaybackToTimeline(immediateVideo, targetScene, targetVideoTimeForRender)
          }
        }
        if (needsCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
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
          if (needsCrossTransition && previousSceneIndex !== null && previousScene && previousSceneEndVideoTime !== null) {
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
          if (needsCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
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

            // Play 모드에서 로딩 완료 후 즉시 전환 적용을 위해 한 번 더 렌더링
            if (applied && transportState.isPlaying) {
              requestAnimationFrame(() => {
                if (requestId !== renderRequestIdRef.current) {
                  return
                }
                const currentT = transportHook.transport?.getTime() ?? 0
                const currentResolved = resolveProSceneAtTime(scenes, currentT, {
                  forceSceneIndex: targetSceneIndex,
                })
                if (currentResolved && currentResolved.sceneIndex === targetSceneIndex) {
                  applyVisualState()
                }
              })
            }
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
            // 전환 중에는 비디오를 항상 일시정지 상태로 유지
            syncVideoToFrame(currentVideo, targetVideoTimeForRender)
          } else {
            syncVideoPlaybackToTimeline(currentVideo, targetScene, targetVideoTimeForRender)
          }
        }
        if (needsCrossTransition && previousSceneIndex !== null && previousSceneEndVideoTime !== null) {
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
      cleanupSceneResources,
      currentSceneIndexRef,
      ensureSceneLoaded,
      loadImageAsSprite,
      pixiReady,
      renderSubtitle,
      syncVideoPlaybackToTimeline,
      scenes,
      playableScenes,
      spritesRef,
      timeline,
      videoElementsRef,
      sceneLoadingStateRef,
      transportState.isPlaying,
      transportHook.transport,
    ]
  )

  useEffect(() => {
    renderAtRef.current = renderAt
  }, [renderAt])

  // 사전 로딩 체크: 200ms마다 현재 시점에서 전환 예상되는 씬들을 미리 로드
  useEffect(() => {
    if (!pixiReady || !transportState.isPlaying) {
      return
    }

    const checkInterval = setInterval(() => {
      if (!transportHook.transport) {
        return
      }
      const currentTime = transportHook.transport.getTime()
      const resolved = resolveProSceneAtTime(scenes, currentTime, {})
      if (!resolved) {
        return
      }

      const currentSceneIndex = resolved.sceneIndex
      preloadScenesForTransition(currentTime, currentSceneIndex)
    }, PRELOAD_CHECK_INTERVAL_MS)

    return () => {
      clearInterval(checkInterval)
    }
  }, [
    pixiReady,
    transportState.isPlaying,
    transportHook.transport,
    scenes,
    preloadScenesForTransition,
  ])

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
