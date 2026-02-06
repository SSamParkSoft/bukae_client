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
    _scene: TimelineData['scenes'][number]
  ): void => {
    const manager = transitionShaderManagerRef.current
    if (!manager || !appRef.current || !containerRef.current) {
      return
    }

    // 첫 번째 씬으로 전환하는 경우 (이전 씬이 없음) shader transition 건너뛰기
    // previousSceneIndex가 null이거나 -1이면 이전 씬이 없으므로 shader transition 불가능
    if (previousSceneIndex === null || previousSceneIndex < 0) {
      // 첫 번째 씬으로 전환하는 경우는 shader transition을 건너뛰고 direct transition 사용
      return
    }

    // 씬 Container 가져오기 (없으면 생성)
    let sceneAContainer = sceneContainersRef.current.get(previousSceneIndex)
    
    // Scene A container가 없거나 destroyed 상태면 생성 (이전 씬이 있는 경우)
    if (!sceneAContainer || sceneAContainer.destroyed) {
      sceneAContainer = new PIXI.Container()
      sceneContainersRef.current.set(previousSceneIndex, sceneAContainer)
      
      // 메인 container에 추가 (아직 추가되지 않은 경우)
      if (containerRef.current && !containerRef.current.children.includes(sceneAContainer)) {
        containerRef.current.addChild(sceneAContainer)
      }
    }
    
    // Scene B container가 없거나 destroyed 상태면 생성
    let sceneBContainer = sceneContainersRef.current.get(sceneIndex)
    if (!sceneBContainer || sceneBContainer.destroyed) {
      // Scene B container 생성
      sceneBContainer = new PIXI.Container()
      sceneContainersRef.current.set(sceneIndex, sceneBContainer)
      
      // 메인 container에 추가 (아직 추가되지 않은 경우)
      if (containerRef.current && !containerRef.current.children.includes(sceneBContainer)) {
        containerRef.current.addChild(sceneBContainer)
      }
    }

    // Transition 시작 (처음 한 번만)
    if (!manager.isActive()) {
      // sceneAContainer와 sceneBContainer 유효성 검사
      if (!sceneAContainer || sceneAContainer.destroyed) {
        return
      }

      if (!sceneBContainer || sceneBContainer.destroyed) {
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
          manager.endTransition()
          return
        }

        manager.createTransitionQuad(shader, containerRef.current)
      } catch (error) {
        manager.endTransition()
        return
      }
    }

    // 진행률 업데이트
    if (!timeline) {
      return
    }
    // Transition duration을 1초로 고정 (움직임효과만 TTS 캐시 duration 사용)
    const transitionDuration = 1.0
    const sceneStartTime = getSceneStartTime(timeline, sceneIndex)
    // Transition은 씬 시작 시점에 시작되도록 함
    const transitionStartTime = sceneStartTime
    const relativeTime = Math.max(0, t - transitionStartTime)
    const progress = Math.min(1, relativeTime / transitionDuration)

    manager.updateProgress(progress)

    // Transition 완료 시 정리
    if (progress >= 1) {
      manager.endTransition()
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
    
    // 텍스처의 원본 크기 추출 (스프라이트의 현재 렌더링 크기가 아닌 텍스처 원본 크기)
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
            // 이전 씬의 텍스처 원본 크기 추출
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
            // 이전 씬의 텍스처 원본 크기 추출
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
            // 이전 씬의 텍스처 원본 크기 추출
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
            // 이전 씬의 텍스처 원본 크기 추출
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
        // Wipe: Shader 기반 효과 (shader transition이 실패했을 때만 fallback으로 사용)
        // 일반적으로는 step6에서 shader transition으로 처리되므로 이 코드는 실행되지 않음
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'circle':
      case 'circular':
        // Circle: 원형으로 확장되며 나타남 (마스크 + 페이드)
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.x = originalX
        toSprite.y = originalY
        toSprite.alpha = eased // 페이드 효과 추가
        toSprite.visible = true
        
        // 원형 마스크 생성 (이미지 중심에서 확장)
        // 마스크 좌표는 스프라이트의 부모 컨테이너 좌표계를 사용
        // 스프라이트의 anchor가 (0.5, 0.5)이므로, originalX와 originalY는 이미 이미지의 중심점 좌표
        // 따라서 마스크의 중심점도 originalX, originalY를 사용
        const centerX = originalX
        const centerY = originalY
        
        // 이미지의 대각선 길이를 기준으로 최대 반지름 설정 (이미지 크기에 맞춤)
        const imageDiagonal = Math.sqrt(
          Math.pow(originalWidth, 2) + Math.pow(originalHeight, 2)
        )
        const maxRadius = imageDiagonal * 0.6 // 반지름을 조금 더 줄임
        const currentRadius = eased * maxRadius
        
        // Graphics를 사용하여 원형 마스크 생성
        // 마스크는 스프라이트와 같은 부모 컨테이너에 있어야 함
        let mask: PIXI.Graphics
        const spriteParent = toSprite.parent || containerRef.current
        
        if (!toSprite.mask || !(toSprite.mask instanceof PIXI.Graphics)) {
          // 기존 마스크가 있으면 제거
          const existingMask = toSprite.mask
          if (existingMask && existingMask instanceof PIXI.Graphics) {
            if (existingMask.parent) {
              existingMask.parent.removeChild(existingMask)
            }
            existingMask.destroy()
          }
          
          mask = new PIXI.Graphics()
          toSprite.mask = mask
          
          // 마스크를 스프라이트와 같은 부모에 추가
          if (spriteParent) {
            spriteParent.addChild(mask)
            // 마스크를 스프라이트 뒤에 배치 (렌더링 순서)
            const spriteIndex = spriteParent.getChildIndex(toSprite)
            spriteParent.setChildIndex(mask, Math.max(0, spriteIndex))
          }
          
          // 마스크는 보이지 않아야 함 (렌더링되지 않음)
          mask.visible = true
          mask.renderable = true
        } else {
          mask = toSprite.mask as PIXI.Graphics
          // 마스크가 부모에 없으면 추가
          if (!mask.parent && spriteParent) {
            spriteParent.addChild(mask)
            const spriteIndex = spriteParent.getChildIndex(toSprite)
            spriteParent.setChildIndex(mask, Math.max(0, spriteIndex))
          }
          
          // 마스크는 보이지 않아야 함
          mask.visible = true
          mask.renderable = true
        }
        
        // 마스크 위치를 부모 컨테이너 좌표계에 맞춤 (부모 컨테이너의 원점 기준)
        mask.x = 0
        mask.y = 0
        
        // 마스크를 매 프레임마다 다시 그리기
        // 중심점은 부모 컨테이너 좌표계 기준
        // 마스크는 흰색 영역이 보이는 영역, 검은색/투명 영역이 숨겨지는 영역
        mask.clear()
        mask.beginFill(0x000000, 0.0)
        mask.drawCircle(centerX, centerY, currentRadius)
        mask.endFill()
        
        // 이전 씬 페이드 아웃
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'rotate':
        // Rotate: 회전하며 나타남
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.x = originalX
        toSprite.y = originalY
        // 회전: -360도에서 0도로
        const rotationAngle = -Math.PI * 2 * (1 - eased) // -2π에서 0으로
        toSprite.rotation = rotationAngle
        toSprite.alpha = eased
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'blur':
        // Blur: 블러에서 선명하게
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        
        // 블러 필터 적용 (progress에 따라 블러 강도 조절)
        // progress가 0일 때 최대 블러, 1일 때 블러 없음
        const blurStrength = 30 * (1 - eased) // 30에서 0으로
        if (blurStrength > 0.1) {
          // 블러가 필요한 경우 필터 추가
          if (!toSprite.filters || toSprite.filters.length === 0 || !(toSprite.filters[0] instanceof PIXI.BlurFilter)) {
            toSprite.filters = [new PIXI.BlurFilter()]
          }
          const blurFilter = toSprite.filters[0] as PIXI.BlurFilter
          blurFilter.blur = blurStrength
        } else {
          // 블러가 거의 없으면 필터 제거
          toSprite.filters = []
        }
        
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'glitch':
        // Glitch: 랜덤 위치 이동하며 나타남
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = eased
        toSprite.visible = true
        
        // 글리치 효과: 시간 기반 랜덤 오프셋 (진행률에 따라 안정적으로 계산)
        const glitchIntensity = 20 * (1 - eased) // 진행에 따라 감소
        // progress를 기반으로 시드 생성하여 일관된 랜덤 값 생성
        const seed = Math.floor(clampedProgress * 100) // 0~100 정수로 변환
        const pseudoRandom1 = ((seed * 9301 + 49297) % 233280) / 233280 // 간단한 PRNG
        const pseudoRandom2 = ((seed * 9301 + 49297 + 1) % 233280) / 233280
        const glitchOffsetX = (pseudoRandom1 - 0.5) * glitchIntensity
        const glitchOffsetY = (pseudoRandom2 - 0.5) * glitchIntensity * 0.5 // 세로는 약하게
        toSprite.x = originalX + glitchOffsetX
        toSprite.y = originalY + glitchOffsetY
        
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.alpha = 1 - eased
          fromSprite.visible = clampedProgress < 1
        }
        break

      case 'circle':
      case 'circular':
        // Circle: Shader Transition으로만 처리됨 (Direct Transition에서는 처리하지 않음)
        // Shader Transition이 활성화되지 않은 경우 즉시 전환
        toSprite.width = originalWidth
        toSprite.height = originalHeight
        toSprite.alpha = 1
        toSprite.visible = true
        if (fromSprite && !fromSprite.destroyed) {
          fromSprite.visible = false
          fromSprite.alpha = 0
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
  }, [timeline, fabricCanvasRef, fabricScaleRatioRef, stageDimensions, containerRef])

  return {
    applyShaderTransition,
    applyDirectTransition,
  }
}
