/**
 * Transition 효과 적용 훅
 * Shader Transition과 Direct Transition 적용
 */

'use client'

import { useCallback } from 'react'
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
  /**
   * Direct Transition 적용 함수
   *
   * containerB / containerA が渡された場合はコンテナ単位で処理:
   *   - slide-*: container.x / container.y を移動 (sprite 座標は固定)
   *   - fade / zoom / rotate / blur / glitch:
   *       containerA.alpha = 1 固定, containerB.alpha = progress (0→1)
   *       spriteB.alpha = 1 固定 (二重適用防止)
   */
  applyDirectTransition: (
    toSprite: PIXI.Sprite | null,
    fromSprite: PIXI.Sprite | null,
    transition: string,
    progress: number,
    sceneIndex: number,
    containerB?: PIXI.Container | null,
    containerA?: PIXI.Container | null
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
    _scene: TimelineData['scenes'][number]
  ): void => {
    const manager = transitionShaderManagerRef.current
    if (!manager || !appRef.current || !containerRef.current) {
      return
    }

    // 첫 번째 씬으로 전환하는 경우 (이전 씬이 없음) shader transition 건너뛰기
    if (previousSceneIndex === null || previousSceneIndex < 0) {
      return
    }

    // 씬 Container 가져오기 (없으면 생성)
    let sceneAContainer = sceneContainersRef.current.get(previousSceneIndex)

    if (!sceneAContainer || sceneAContainer.destroyed) {
      sceneAContainer = new PIXI.Container()
      sceneContainersRef.current.set(previousSceneIndex, sceneAContainer)

      if (containerRef.current && !containerRef.current.children.includes(sceneAContainer)) {
        containerRef.current.addChild(sceneAContainer)
      }
    }

    let sceneBContainer = sceneContainersRef.current.get(sceneIndex)
    if (!sceneBContainer || sceneBContainer.destroyed) {
      sceneBContainer = new PIXI.Container()
      sceneContainersRef.current.set(sceneIndex, sceneBContainer)

      if (containerRef.current && !containerRef.current.children.includes(sceneBContainer)) {
        containerRef.current.addChild(sceneBContainer)
      }
    }

    if (!manager.isActive()) {
      if (!sceneAContainer || sceneAContainer.destroyed) return
      if (!sceneBContainer || sceneBContainer.destroyed) return

      try {
        manager.beginTransition(
          sceneAContainer,
          sceneBContainer,
          previousSceneIndex!,
          sceneIndex
        )

        const shader = createTransitionShader(transitionType)
        if (!shader) {
          manager.endTransition()
          return
        }

        manager.createTransitionQuad(shader, containerRef.current)
      } catch (_error) {
        manager.endTransition()
        return
      }
    }

    if (!timeline) return
    const currentScene = timeline.scenes[sceneIndex]
    const nextScene = timeline.scenes[sceneIndex + 1]
    const isSameSceneId = nextScene && currentScene?.sceneId === nextScene.sceneId
    const transitionDuration = isSameSceneId ? 0 : (currentScene?.transitionDuration ?? 0.5)
    const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    const transitionStartTime = sceneStartTime
    const relativeTime = Math.max(0, t - transitionStartTime)
    const progress = Math.min(1, relativeTime / transitionDuration)

    manager.updateProgress(progress)

    if (progress >= 1) {
      manager.endTransition()
    }
  }, [appRef, containerRef, timeline, sceneContainersRef, transitionShaderManagerRef])

  /**
   * Progress 기반 Transition 직접 계산 함수 (ANIMATION.md 표준)
   *
   * containerB / containerA が渡された場合 → コンテナ単位で処理 (プラン A アーキテクチャ)
   *   - slide-*:
   *       containerB の x/y を移動、containerA の x/y を移動
   *       sprite の x/y は originalX/Y 固定 (sprite.parent が container なので絶対位置は合成される)
   *   - fade / zoom / rotate / blur / glitch (제자리 효과):
   *       containerA.alpha = 1 固定 (変更しない)
   *       containerB.alpha = progress (0→1)
   *       toSprite.alpha = 1 固定 (二重適用防止)
   *       効果 (scale / rotation / blur / offset) は toSprite に適用
   *
   * containerB / containerA が渡されない場合 → 従来のスプライト単位処理 (後方互換)
   */
  const applyDirectTransition = useCallback((
    toSprite: PIXI.Sprite | null,
    fromSprite: PIXI.Sprite | null,
    transition: string,
    progress: number,
    sceneIndex: number,
    containerB?: PIXI.Container | null,
    containerA?: PIXI.Container | null
  ): void => {
    if (!toSprite || toSprite.destroyed) {
      return
    }

    const clampedProgress = Math.max(0, Math.min(1, progress))
    // 백엔드(FFmpeg xfade)와 동일하게 linear 진행
    const eased = clampedProgress

    const normalizedTransition = transition.toLowerCase()

    // 원래 위치 및 크기 계산
    const scene = timeline?.scenes[sceneIndex]
    if (!scene) return

    const texture = toSprite.texture
    const spriteTexture = texture && texture.width > 0 && texture.height > 0
      ? { width: texture.width, height: texture.height }
      : null

    const position = getFabricImagePosition(
      sceneIndex,
      scene,
      fabricCanvasRef,
      fabricScaleRatioRef,
      stageDimensions,
      spriteTexture
    )
    const { x: originalX, y: originalY, width: originalWidth, height: originalHeight } = position

    // 기본 크기 설정 (transition에서 별도로 조정되지 않는 경우)
    if (toSprite) {
      toSprite.width = originalWidth
      toSprite.height = originalHeight
      toSprite.scale.set(1, 1)
    }

    // ──────────────────────────────────────────────────────────────
    // 컨테이너 기반 처리 (containerB 제공 시)
    // ──────────────────────────────────────────────────────────────
    if (containerB) {
      switch (normalizedTransition) {
        // ── 공간 이동형: 컨테이너 x/y 이동, sprite 좌표 고정 ──
        case 'slide-left': {
          const offset = stageDimensions.width
          // sceneB: 오른쪽에서 진입 (+offset → 0)
          containerB.x = offset * (1 - eased)
          containerB.y = 0
          // sceneA: 왼쪽으로 퇴장 (0 → -offset)
          if (containerA) {
            containerA.x = -offset * eased
            containerA.y = 0
          }
          // sprite 좌표 고정 (container 내부 기준)
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true
          containerB.visible = true
          if (containerA) containerA.visible = clampedProgress < 1
          break
        }

        case 'slide-right': {
          const offset = stageDimensions.width
          // sceneB: 왼쪽에서 진입 (-offset → 0)
          containerB.x = -offset * (1 - eased)
          containerB.y = 0
          if (containerA) {
            containerA.x = offset * eased
            containerA.y = 0
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true
          containerB.visible = true
          if (containerA) containerA.visible = clampedProgress < 1
          break
        }

        case 'slide-up': {
          const offset = stageDimensions.height
          // sceneB: 아래에서 진입 (+offset → 0)
          containerB.y = offset * (1 - eased)
          containerB.x = 0
          if (containerA) {
            containerA.y = -offset * eased
            containerA.x = 0
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true
          containerB.visible = true
          if (containerA) containerA.visible = clampedProgress < 1
          break
        }

        case 'slide-down': {
          const offset = stageDimensions.height
          // sceneB: 위에서 진입 (-offset → 0)
          containerB.y = -offset * (1 - eased)
          containerB.x = 0
          if (containerA) {
            containerA.y = offset * eased
            containerA.x = 0
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true
          containerB.visible = true
          if (containerA) containerA.visible = clampedProgress < 1
          break
        }

        // ── 제자리 효과형: containerB.alpha = progress, containerA.alpha=1 고정 ──
        //    spriteB.alpha = 1 (이중 적용 방지)
        case 'fade': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1  // 고정
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1  // 이중 적용 방지
          toSprite.visible = true
          break
        }

        case 'zoom-in': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          const zoomInScale = 0.5 + 0.5 * eased
          toSprite.scale.set(zoomInScale, zoomInScale)
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'zoom-out': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          const zoomOutScale = 1.5 - 0.5 * eased
          toSprite.scale.set(zoomOutScale, zoomOutScale)
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'rotate': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.rotation = Math.PI * 2 * clampedProgress
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'blur': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true

          if (!toSprite.filters || toSprite.filters.length === 0 || !(toSprite.filters[0] instanceof PIXI.BlurFilter)) {
            toSprite.filters = [new PIXI.BlurFilter()]
          }
          const blurFilter = toSprite.filters[0] as PIXI.BlurFilter
          blurFilter.blur = 30 * (1 - eased)
          break
        }

        case 'glitch': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          const glitchOffsetX = Math.sin(clampedProgress * 10 * Math.PI) * 20
          const glitchOffsetY = Math.cos(clampedProgress * 11 * Math.PI) * 20
          toSprite.x = originalX + glitchOffsetX
          toSprite.y = originalY + glitchOffsetY
          toSprite.width = originalWidth
          toSprite.height = originalHeight
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'wipe-left':
        case 'wipe-right':
        case 'wipe-up':
        case 'wipe-down': {
          // Wipe: shader fallback
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'circle':
        case 'circular': {
          containerB.alpha = eased
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.alpha = 1
            containerA.visible = clampedProgress < 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }

        case 'none':
        default: {
          containerB.alpha = 1
          containerB.x = 0
          containerB.y = 0
          containerB.visible = true
          if (containerA) {
            containerA.visible = false
            containerA.alpha = 1
          }
          toSprite.x = originalX
          toSprite.y = originalY
          toSprite.alpha = 1
          toSprite.visible = true
          break
        }
      }
      return
    }

    // ──────────────────────────────────────────────────────────────
    // 기존 스프라이트 단위 처리 (containerB 미제공 시 – 후방 호환)
    // ──────────────────────────────────────────────────────────────
    switch (normalizedTransition) {
      case 'fade':
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 0
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'slide-left': {
        const slideLeftOffset = stageDimensions.width
        toSprite.x = originalX + slideLeftOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevTexture = fromSprite.texture
            const prevSpriteTexture = prevTexture && prevTexture.width > 0 && prevTexture.height > 0
              ? { width: prevTexture.width, height: prevTexture.height }
              : null
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions,
              prevSpriteTexture
            )
            fromSprite.x = prevPosition.x - slideLeftOffset * eased
          } else {
            fromSprite.x = stageDimensions.width * 0.5 - slideLeftOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'slide-right': {
        const slideRightOffset = stageDimensions.width
        toSprite.x = originalX - slideRightOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevTexture = fromSprite.texture
            const prevSpriteTexture = prevTexture && prevTexture.width > 0 && prevTexture.height > 0
              ? { width: prevTexture.width, height: prevTexture.height }
              : null
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions,
              prevSpriteTexture
            )
            fromSprite.x = prevPosition.x + slideRightOffset * eased
          } else {
            fromSprite.x = stageDimensions.width * 0.5 + slideRightOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'slide-up': {
        const slideUpOffset = stageDimensions.height
        toSprite.y = originalY + slideUpOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevTexture = fromSprite.texture
            const prevSpriteTexture = prevTexture && prevTexture.width > 0 && prevTexture.height > 0
              ? { width: prevTexture.width, height: prevTexture.height }
              : null
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions,
              prevSpriteTexture
            )
            fromSprite.y = prevPosition.y - slideUpOffset * eased
          } else {
            const imageY = stageDimensions.height * 0.15
            fromSprite.y = imageY + (stageDimensions.height * 0.7) * 0.5 - slideUpOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'slide-down': {
        const slideDownOffset = stageDimensions.height
        toSprite.y = originalY - slideDownOffset * (1 - eased)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          const prevSceneIndex = sceneIndex > 0 ? sceneIndex - 1 : 0
          const prevScene = timeline?.scenes[prevSceneIndex]
          if (prevScene) {
            const prevTexture = fromSprite.texture
            const prevSpriteTexture = prevTexture && prevTexture.width > 0 && prevTexture.height > 0
              ? { width: prevTexture.width, height: prevTexture.height }
              : null
            const prevPosition = getFabricImagePosition(
              prevSceneIndex,
              prevScene,
              fabricCanvasRef,
              fabricScaleRatioRef,
              stageDimensions,
              prevSpriteTexture
            )
            fromSprite.y = prevPosition.y + slideDownOffset * eased
          } else {
            const imageY = stageDimensions.height * 0.15
            fromSprite.y = imageY + (stageDimensions.height * 0.7) * 0.5 + slideDownOffset * eased
          }
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'zoom-in': {
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
      }

      case 'zoom-out': {
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
      }

      case 'wipe-left':
      case 'wipe-right':
      case 'wipe-up':
      case 'wipe-down':
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'circle':
      case 'circular': {
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.x = originalX
        toSprite.y = originalY
        toSprite.alpha = eased
        toSprite.visible = true

        const centerX = originalX
        const centerY = originalY
        const imageDiagonal = Math.sqrt(
          Math.pow(originalWidth, 2) + Math.pow(originalHeight, 2)
        )
        const maxRadius = imageDiagonal * 0.6
        const currentRadius = eased * maxRadius

        const spriteParent = toSprite.parent || containerRef.current
        let mask: PIXI.Graphics

        if (!toSprite.mask || !(toSprite.mask instanceof PIXI.Graphics)) {
          const existingMask = toSprite.mask
          if (existingMask && existingMask instanceof PIXI.Graphics) {
            if (existingMask.parent) existingMask.parent.removeChild(existingMask)
            existingMask.destroy()
          }
          mask = new PIXI.Graphics()
          toSprite.mask = mask
          if (spriteParent) {
            spriteParent.addChild(mask)
            const spriteIndex = spriteParent.getChildIndex(toSprite)
            spriteParent.setChildIndex(mask, Math.max(0, spriteIndex))
          }
          mask.visible = true
          mask.renderable = true
        } else {
          mask = toSprite.mask as PIXI.Graphics
          if (!mask.parent && spriteParent) {
            spriteParent.addChild(mask)
            const spriteIndex = spriteParent.getChildIndex(toSprite)
            spriteParent.setChildIndex(mask, Math.max(0, spriteIndex))
          }
          mask.visible = true
          mask.renderable = true
        }

        mask.x = 0
        mask.y = 0
        mask.clear()
        mask.beginFill(0x000000, 0.0)
        mask.drawCircle(centerX, centerY, currentRadius)
        mask.endFill()

        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'rotate':
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.x = originalX
        toSprite.y = originalY
        toSprite.rotation = Math.PI * 2 * clampedProgress
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'blur': {
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.visible = true
        toSprite.alpha = eased

        if (!toSprite.filters || toSprite.filters.length === 0 || !(toSprite.filters[0] instanceof PIXI.BlurFilter)) {
          toSprite.filters = [new PIXI.BlurFilter()]
        }
        const blurFilter = toSprite.filters[0] as PIXI.BlurFilter
        blurFilter.blur = 30 * (1 - eased)

        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'glitch': {
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = eased
        toSprite.visible = true

        const glitchOffsetX = Math.sin(clampedProgress * 10 * Math.PI) * 20
        const glitchOffsetY = Math.cos(clampedProgress * 11 * Math.PI) * 20
        toSprite.x = originalX + glitchOffsetX
        toSprite.y = originalY + glitchOffsetY

        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break
      }

      case 'none':
      default:
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
  }, [timeline, fabricCanvasRef, fabricScaleRatioRef, stageDimensions, containerRef])

  return {
    applyShaderTransition,
    applyDirectTransition,
  }
}
