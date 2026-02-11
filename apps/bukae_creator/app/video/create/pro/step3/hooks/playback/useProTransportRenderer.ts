'use client'

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import { useTransport } from '@/hooks/video/transport/useTransport'
import { useTransportState } from '@/hooks/video/renderer/transport/useTransportState'
import { useRenderLoop } from '@/hooks/video/renderer/playback/useRenderLoop'
import type { TimelineData } from '@/store/useVideoCreateStore'
import type { ProStep3Scene } from '@/app/video/create/pro/step3/components/ProSceneListPanel'
import { getPlayableScenes, getPreviousPlayableDuration, getSceneSegmentDuration } from '../../utils/proPlaybackUtils'

interface UseProTransportRendererParams {
  timeline: TimelineData | null
  scenes: ProStep3Scene[]
  pixiReady: boolean
  appRef: React.MutableRefObject<PIXI.Application | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  videoTexturesRef: React.MutableRefObject<Map<number, PIXI.Texture>>
  currentSceneIndexRef: React.MutableRefObject<number>
  loadVideoAsSprite: (sceneIndex: number, videoUrl: string, selectionStartSeconds?: number) => Promise<void>
  renderSubtitle: (sceneIndex: number, script: string) => void
}

interface RenderAtOptions {
  skipAnimation?: boolean
  forceSceneIndex?: number
}

/**
 * Pro 트랙용 Transport 기반 렌더러
 * 타임라인 시간 t에 맞춰 비디오 프레임을 렌더링
 */
export function useProTransportRenderer({
  timeline,
  scenes,
  pixiReady,
  appRef,
  spritesRef,
  textsRef,
  videoElementsRef,
  videoTexturesRef,
  currentSceneIndexRef,
  loadVideoAsSprite,
  renderSubtitle,
}: UseProTransportRendererParams) {
  const transportHook = useTransport()
  const { transportState } = useTransportState({ transport: transportHook.transport })
  const renderAtRef = useRef<((tSec: number, options?: RenderAtOptions) => void) | undefined>(undefined)
  const lastRenderedTimeRef = useRef<number>(-1)
  const lastRenderedSceneIndexRef = useRef<number>(-1)

  /**
   * renderAt(t) - 타임라인 시간 t에 해당하는 프레임을 렌더링
   */
  const renderAt = useCallback(
    (tSec: number, options?: RenderAtOptions) => {
      if (!pixiReady || !timeline || !appRef.current) {
        return
      }

      // 중복 렌더링 방지 (같은 시간에 여러 번 렌더링하지 않음)
      if (!options?.forceSceneIndex && Math.abs(tSec - lastRenderedTimeRef.current) < 0.01) {
        return
      }

      const playableScenes = getPlayableScenes(scenes)
      if (playableScenes.length === 0) {
        return
      }

      // 타임라인 시간 t에 해당하는 씬 찾기
      let targetSceneIndex: number | null = null
      let sceneTimeInSegment = 0

      if (options?.forceSceneIndex !== undefined) {
        // 강제 씬 인덱스가 지정된 경우
        targetSceneIndex = options.forceSceneIndex
        sceneTimeInSegment = 0
      } else {
        // 타임라인 시간으로 씬 찾기
        let accumulatedTime = 0
        for (let i = 0; i < playableScenes.length; i++) {
          const playableScene = playableScenes[i]
          const sceneDuration = playableScene.duration
          const sceneEndTime = accumulatedTime + sceneDuration

          if (tSec >= accumulatedTime && tSec < sceneEndTime) {
            targetSceneIndex = playableScene.originalIndex
            sceneTimeInSegment = tSec - accumulatedTime
            break
          }

          accumulatedTime = sceneEndTime
        }

        // 마지막 씬인 경우 (tSec가 마지막 씬의 끝 시간과 같거나 큰 경우)
        if (targetSceneIndex === null && playableScenes.length > 0) {
          const lastScene = playableScenes[playableScenes.length - 1]
          const totalDuration = playableScenes.reduce((sum, ps) => sum + ps.duration, 0)
          if (tSec >= totalDuration - lastScene.duration) {
            targetSceneIndex = lastScene.originalIndex
            sceneTimeInSegment = Math.min(tSec - (totalDuration - lastScene.duration), lastScene.duration)
          }
        }
      }

      if (targetSceneIndex === null) {
        return
      }

      const targetScene = scenes[targetSceneIndex]
      if (!targetScene || !targetScene.videoUrl) {
        return
      }

      // 씬이 변경되었거나 강제 렌더링인 경우에만 비디오 로드
      const sceneChanged = lastRenderedSceneIndexRef.current !== targetSceneIndex
      
      // 비디오의 실제 시간 계산 (selectionStartSeconds + sceneTimeInSegment)
      const videoTime = (targetScene.selectionStartSeconds ?? 0) + sceneTimeInSegment
      
      if (sceneChanged || options?.forceSceneIndex !== undefined) {
        // 씬이 변경되었으면 비디오 로드
        void loadVideoAsSprite(targetSceneIndex, targetScene.videoUrl, videoTime).then(() => {
          // 비디오 로드 완료 후 자막 렌더링
          renderSubtitle(targetSceneIndex, targetScene.script ?? '')
          
          // 타임라인의 imageTransform 적용
          const timelineScene = timeline.scenes?.[targetSceneIndex]
          const sprite = spritesRef.current.get(targetSceneIndex)
          if (sprite && !sprite.destroyed) {
            if (timelineScene?.imageTransform) {
              sprite.x = timelineScene.imageTransform.x
              sprite.y = timelineScene.imageTransform.y
              sprite.width = timelineScene.imageTransform.width
              sprite.height = timelineScene.imageTransform.height
              sprite.rotation = timelineScene.imageTransform.rotation ?? 0
            }
            sprite.visible = true
            sprite.alpha = 1
          }

          // 다른 씬의 스프라이트 숨김
          spritesRef.current.forEach((s, index) => {
            if (index !== targetSceneIndex && !s.destroyed) {
              s.visible = false
              s.alpha = 0
            }
          })

          currentSceneIndexRef.current = targetSceneIndex
          lastRenderedSceneIndexRef.current = targetSceneIndex
        })
      } else {
        // 같은 씬이면 비디오 시간만 업데이트
        const video = videoElementsRef.current.get(targetSceneIndex)
        if (video && video.readyState >= 2) {
          // 비디오가 준비되어 있으면 시간 업데이트
          if (Math.abs(video.currentTime - videoTime) > 0.1) {
            video.currentTime = videoTime
          }
        }

        // 타임라인의 imageTransform 적용
        const timelineScene = timeline.scenes?.[targetSceneIndex]
        const sprite = spritesRef.current.get(targetSceneIndex)
        if (sprite && !sprite.destroyed) {
          if (timelineScene?.imageTransform) {
            sprite.x = timelineScene.imageTransform.x
            sprite.y = timelineScene.imageTransform.y
            sprite.width = timelineScene.imageTransform.width
            sprite.height = timelineScene.imageTransform.height
            sprite.rotation = timelineScene.imageTransform.rotation ?? 0
          }
          sprite.visible = true
          sprite.alpha = 1
        }
      }

      lastRenderedTimeRef.current = tSec
    },
    [
      pixiReady,
      timeline,
      scenes,
      appRef,
      spritesRef,
      videoElementsRef,
      currentSceneIndexRef,
      loadVideoAsSprite,
      renderSubtitle,
    ]
  )

  // renderAt ref 업데이트
  useEffect(() => {
    renderAtRef.current = renderAt
  }, [renderAt])

  // Transport 재생 루프
  useRenderLoop({
    transport: transportHook.transport,
    transportState,
    renderAt,
    playingSceneIndex: null, // Pro 트랙에서는 씬별 재생 없음
    playingGroupSceneId: null,
  })

  return {
    transport: transportHook.transport,
    transportHook, // 전체 hook 반환값도 반환 (play, pause, seek 등 사용 가능)
    transportState,
    renderAt,
    renderAtRef,
  }
}
