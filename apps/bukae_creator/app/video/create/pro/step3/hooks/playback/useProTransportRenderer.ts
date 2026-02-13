'use client'

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTransportState } from '@/hooks/video/renderer/transport/useTransportState'
import { useRenderLoop } from '@/hooks/video/renderer/playback/useRenderLoop'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/model/types'
import { clampVideoTimeToSelection, resolveProSceneAtTime } from '../../utils/proPlaybackUtils'

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
}

function hideSprite(sprite: PIXI.Sprite) {
  if (!sprite.destroyed) {
    sprite.visible = false
    sprite.alpha = 0
  }
}

function applySceneBaseTransform(sprite: PIXI.Sprite, scene: TimelineData['scenes'][number] | null | undefined) {
  if (!scene?.imageTransform || sprite.destroyed) {
    return
  }

  sprite.x = scene.imageTransform.x
  sprite.y = scene.imageTransform.y
  sprite.width = scene.imageTransform.width
  sprite.height = scene.imageTransform.height
  sprite.rotation = scene.imageTransform.rotation ?? 0
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
  const pendingSceneLoadRef = useRef<Map<number, Promise<void>>>(new Map())

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

      const loadPromise = loadVideoAsSprite(sceneIndex, scene.videoUrl, videoTime)
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

      if (!options?.forceSceneIndex && Math.abs(tSec - lastRenderedTimeRef.current) < 0.01) {
        return
      }

      const resolved = resolveProSceneAtTime(scenes, tSec, {
        forceSceneIndex: options?.forceSceneIndex,
      })
      if (!resolved) {
        return
      }

      const targetSceneIndex = resolved.sceneIndex
      const targetScene = scenes[targetSceneIndex]
      if (!targetScene || !targetScene.videoUrl) {
        return
      }

      const segmentVideoTime = (targetScene.selectionStartSeconds ?? 0) + resolved.sceneTimeInSegment
      const videoTime = clampVideoTimeToSelection(targetScene, segmentVideoTime)
      const sceneChanged = lastRenderedSceneIndexRef.current !== targetSceneIndex

      const applyVisualState = () => {
        const sprite = spritesRef.current.get(targetSceneIndex)
        if (!sprite || sprite.destroyed) {
          return
        }

        const timelineScene = timeline.scenes?.[targetSceneIndex]
        applySceneBaseTransform(sprite, timelineScene)
        sprite.visible = true
        sprite.alpha = 1

        spritesRef.current.forEach((s, index) => {
          if (index !== targetSceneIndex) {
            hideSprite(s)
          }
        })
      }

      if (sceneChanged || options?.forceSceneIndex !== undefined) {
        void ensureSceneLoaded(targetSceneIndex, targetScene, videoTime).then(() => {
          renderSubtitle(targetSceneIndex, targetScene.script ?? '')
          applyVisualState()
          currentSceneIndexRef.current = targetSceneIndex
          lastRenderedSceneIndexRef.current = targetSceneIndex
        })
      } else {
        const currentVideo = videoElementsRef.current.get(targetSceneIndex)
        if (currentVideo && currentVideo.readyState >= 2 && Math.abs(currentVideo.currentTime - videoTime) > 0.1) {
          currentVideo.currentTime = videoTime
        }
        applyVisualState()
      }

      lastRenderedTimeRef.current = tSec
    },
    [
      appRef,
      currentSceneIndexRef,
      ensureSceneLoaded,
      pixiReady,
      renderSubtitle,
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
