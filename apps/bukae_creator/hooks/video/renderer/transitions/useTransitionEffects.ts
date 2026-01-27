/**
 * Transition 효과 적용 훅
 * Shader Transition과 Direct Transition 적용
 */

'use client'

import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { getSceneStartTime } from '@/utils/timeline'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { TransitionShaderManager } from '../../effects/transitions/shader/TransitionShaderManager'
import { createTransitionShader } from '../../effects/transitions/shader/shaders'
import { getFabricImagePosition } from '../utils/getFabricPosition'
import type { StageDimensions } from '../../types/common'

/**
 * Transition 효과 적용 훅 파라미터
 */
export interface UseTransitionEffectsParams {
  /** Timeline 데이터 */
  timeline: TimelineData | null
  /** PixiJS Application ref */
  appRef: React.RefObject<PIXI.Application | null>
  /** PixiJS Container ref */
  containerRef: React.RefObject<PIXI.Container | null>
  /** 씬 Container 맵 ref */
  sceneContainersRef: React.MutableRefObject<Map<number, PIXI.Container>>
  /** Transition Shader Manager ref */
  transitionShaderManagerRef: React.MutableRefObject<TransitionShaderManager | null>
  /** Fabric canvas ref */
  fabricCanvasRef?: React.RefObject<fabric.Canvas | null>
  /** Fabric 스케일 비율 ref */
  fabricScaleRatioRef?: React.MutableRefObject<number>
  /** 스테이지 크기 */
  stageDimensions: StageDimensions
}

/**
 * Transition 효과 적용 함수들
 */
export interface TransitionEffects {
  /** Shader Transition 적용 함수 */
  applyShaderTransition: (
    t: number,
    sceneIndex: number,
    previousSceneIndex: number | null,
    transitionType: string,
    scene: TimelineData['scenes'][number]
  ) => void
  /** Direct Transition 적용 함수 */
  applyDirectTransition: (
    toSprite: PIXI.Sprite | null,
    fromSprite: PIXI.Sprite | null,
    transition: string,
    progress: number,
    sceneIndex: number
  ) => void
}

/**
 * Transition 효과 적용 훅
 */
export function useTransitionEffects({
  timeline,
  appRef,
  containerRef,
  sceneContainersRef,
  transitionShaderManagerRef,
  fabricCanvasRef,
  fabricScaleRatioRef,
  stageDimensions,
}: UseTransitionEffectsParams): TransitionEffects {
  /**
   * Shader Transition 적용 함수
   * ANIMATION.md 표준에 따른 Shader 기반 Transition 처리
   */
  const applyShaderTransition = useCallback((
    t: number,
    sceneIndex: number,
    previousSceneIndex: number | null,
    transitionType: string,
    scene: TimelineData['scenes'][number]
  ): void => {
    const manager = transitionShaderManagerRef.current
    if (!manager || !appRef.current || !containerRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useTransitionEffects] Shader Transition: Manager or refs not ready', {
          hasManager: !!manager,
          hasApp: !!appRef.current,
          hasContainer: !!containerRef.current,
        })
      }
      return
    }

    // 씬 Container 가져오기
    const sceneAContainer = previousSceneIndex !== null
      ? sceneContainersRef.current.get(previousSceneIndex)
      : null
    const sceneBContainer = sceneContainersRef.current.get(sceneIndex)

    if (!sceneBContainer) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[useTransitionEffects] Shader Transition: Scene B container not found', {
          sceneIndex,
        })
      }
      return
    }

    // Transition 시작 (처음 한 번만)
    if (!manager.isActive()) {
      if (!sceneAContainer) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useTransitionEffects] Shader Transition: Scene A container not found, skipping', {
            previousSceneIndex,
          })
        }
        return
      }

      try {
        manager.beginTransition(
          sceneAContainer,
          sceneBContainer,
          previousSceneIndex!,
          sceneIndex
        )

        // Shader 생성 및 적용
        // TODO: scene.transitionParams에서 추가 파라미터 추출 가능
        const shader = createTransitionShader(transitionType)
        if (!shader) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[useTransitionEffects] Shader Transition: Unknown type "${transitionType}", falling back to GSAP`)
          }
          manager.endTransition()
          return
        }

        manager.createTransitionQuad(shader, containerRef.current)

        if (process.env.NODE_ENV === 'development') {
          console.log('[useTransitionEffects] Shader Transition started:', {
            type: transitionType,
            sceneA: previousSceneIndex,
            sceneB: sceneIndex,
          })
        }
      } catch (error) {
        console.error('[useTransitionEffects] Shader Transition error:', error)
        manager.endTransition()
        return
      }
    }

    // 진행률 업데이트
    if (!timeline) {
      return
    }
    const transitionDuration = scene.transitionDuration || 0.5
    const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    const transitionStartTime = sceneStartTime - transitionDuration
    const relativeTime = Math.max(0, t - transitionStartTime)
    const progress = Math.min(1, relativeTime / transitionDuration)

    manager.updateProgress(progress)

    // Transition 완료 시 정리
    if (progress >= 1) {
      manager.endTransition()
      if (process.env.NODE_ENV === 'development') {
        console.log('[useTransitionEffects] Shader Transition completed')
      }
    }
  }, [appRef, containerRef, timeline, sceneContainersRef, transitionShaderManagerRef])

  /**
   * Progress 기반 Transition 직접 계산 함수 (ANIMATION.md 표준)
   * GSAP 없이 t 기반으로 sprite 속성을 직접 계산하여 설정
   * 
   * 원칙:
   * - progress = (t - transitionStart) / duration
   * - seek/pause/resume 시 progress만 재계산하면 즉시 동일 프레임 재현
   * - `.play()` 같은 시간 흐름은 금지
   */
  const applyDirectTransition = useCallback((
    toSprite: PIXI.Sprite | null,
    fromSprite: PIXI.Sprite | null,
    transition: string,
    progress: number,
    sceneIndex: number
  ): void => {
    if (!toSprite || toSprite.destroyed) {
      return
    }

    // progress를 0~1 범위로 클램프
    const clampedProgress = Math.max(0, Math.min(1, progress))
    
    // easing 적용 (ease-out-cubic: 더 부드러운 효과)
    // 1 - (1 - t)^3 형태로 시작은 느리고 끝은 빠르게
    const eased = 1 - Math.pow(1 - clampedProgress, 3)

    const normalizedTransition = transition.toLowerCase()

    // 원래 위치 및 크기 계산 (Fabric에서 사용자가 설정한 위치 사용)
    const scene = timeline?.scenes[sceneIndex]
    if (!scene) return
    
    const position = getFabricImagePosition(
      sceneIndex,
      scene,
      fabricCanvasRef,
      fabricScaleRatioRef,
      stageDimensions
    )
    const { x: originalX, y: originalY, width: originalWidth, height: originalHeight } = position
    
    // Transition 적용 전에 크기를 원래 크기로 설정 (fabricjs 기본 크기 유지)
    if (toSprite) {
      toSprite.width = originalWidth
      toSprite.height = originalHeight
      toSprite.scale.set(1, 1) // scale은 Transition 효과에서 별도로 설정
    }

    switch (normalizedTransition) {
      case 'fade':
        // Fade: alpha 0 → 1
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = eased
        toSprite.visible = true
        // 이전 씬 페이드 아웃
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'slide-left':
        // Slide Left: 오른쪽에서 왼쪽으로 (원래 위치 기준)
        const slideLeftOffset = Math.max(stageDimensions.width, stageDimensions.height) * 0.1
        toSprite.x = originalX + slideLeftOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          // 이전 씬의 원래 위치 계산
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions
            )
            fromSprite.x = prevPosition.x - slideLeftOffset * eased
          } else {
            fromSprite.x = stageDimensions.width * 0.5 - slideLeftOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'slide-right':
        // Slide Right: 왼쪽에서 오른쪽으로 (원래 위치 기준)
        const slideRightOffset = Math.max(stageDimensions.width, stageDimensions.height) * 0.1
        toSprite.x = originalX - slideRightOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions
            )
            fromSprite.x = prevPosition.x + slideRightOffset * eased
          } else {
            fromSprite.x = stageDimensions.width * 0.5 + slideRightOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'slide-up':
        // Slide Up: 아래에서 위로 (원래 위치 기준)
        const slideUpOffset = Math.max(stageDimensions.width, stageDimensions.height) * 0.1
        toSprite.y = originalY + slideUpOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions
            )
            fromSprite.y = prevPosition.y - slideUpOffset * eased
          } else {
            const imageY = stageDimensions.height * 0.15
            fromSprite.y = imageY + (stageDimensions.height * 0.7) * 0.5 - slideUpOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'slide-down':
        // Slide Down: 위에서 아래로 (원래 위치 기준)
        const slideDownOffset = Math.max(stageDimensions.width, stageDimensions.height) * 0.1
        toSprite.y = originalY - slideDownOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions
            )
            fromSprite.y = prevPosition.y + slideDownOffset * eased
          } else {
            const imageY = stageDimensions.height * 0.15
            fromSprite.y = imageY + (stageDimensions.height * 0.7) * 0.5 + slideDownOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'zoom-in':
        // Zoom In: 작은 크기에서 원래 크기로
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        const zoomInScale = 0.5 + 0.5 * eased
        toSprite.scale.set(zoomInScale, zoomInScale)
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'zoom-out':
        // Zoom Out: 큰 크기에서 원래 크기로
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        const zoomOutScale = 1.5 - 0.5 * eased
        toSprite.scale.set(zoomOutScale, zoomOutScale)
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'wipe-left':
      case 'wipe-right':
      case 'wipe-up':
      case 'wipe-down':
        // Wipe: 마스크 기반 효과 (간단 버전 - fade로 대체)
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'none':
      default:
        // None: 즉시 전환
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.visible = false
          fromSprite.alpha = 0
        }
        break
    }
  }, [timeline, fabricCanvasRef, fabricScaleRatioRef, stageDimensions])

  return {
    applyShaderTransition,
    applyDirectTransition,
  }
}
