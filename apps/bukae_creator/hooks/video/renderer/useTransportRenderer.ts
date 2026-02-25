/**
 * Transport 기반 렌더링 훅
 * PHASE0: Transport 타임라인 시간 `t`를 중심으로 한 결정적 렌더링 시스템
 * 
 * 핵심 원칙:
 * 1. `renderAt(t)`는 순수 함수: 타임라인 시간 `t`만 받아 결정적으로 렌더링
 * 2. 씬 로딩은 사전 처리: 렌더링 전에 필요한 씬을 미리 로드
 * 3. 레거시 의존성 제거: `updateCurrentScene`, `renderSceneContent` 등과 분리
 * 4. Transport 중심: Transport의 `currentTime` 변화에만 반응
 */

'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import type { TimelineData } from '@/store/useVideoCreateStore'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import { TransitionShaderManager } from '../effects/transitions/shader/TransitionShaderManager'
import { useContainerManager } from './containers/useContainerManager'
import { useSubtitleRenderer, normalizeAnchorToTopLeft as _normalizeAnchorToTopLeft, calculateTextPositionInBox as _calculateTextPositionInBox } from './subtitle/useSubtitleRenderer'
import { getPreviewLetterSpacing, getPreviewStrokeWidth } from './subtitle/previewStroke'
import { useTransitionEffects } from './transitions/useTransitionEffects'
import { useTransportState } from './transport/useTransportState'
import { useRenderLoop } from './playback/useRenderLoop'
import { resetBaseState } from './utils/resetBaseState'
import { getSubtitlePosition } from './utils/getSubtitlePosition'
import {
  step1CalculateScenePart,
  step2PrepareResources,
  step3SetupContainers,
  step4ResetBaseState,
  step5ApplyMotion,
  step6ApplyTransition,
  step7ApplySubtitle,
  step8CheckDuplicateRender,
} from './pipeline'
import type {
  UseTransportRendererParams,
  UseTransportRendererReturn,
  RenderAtOptions,
  SceneLoadingStateMap,
} from './types'
import type { PipelineContext } from './pipeline/types'

/**
 * Transport 기반 렌더링 훅
 */
export function useTransportRenderer({
  transport,
  timeline,
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  previousSceneIndexRef,
  activeAnimationsRef: _activeAnimationsRef, // 타입 호환성을 위해 유지 (현재 사용되지 않음)
  stageDimensions,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  getActiveSegment,
  loadPixiTextureWithCache,
  applyEnterEffect: _applyEnterEffect, // ANIMATION.md 표준: GSAP 제거, applyDirectTransition으로 대체
  onSceneLoadComplete,
  playingSceneIndex,
  playingGroupSceneId,
  fabricCanvasRef,
  fabricScaleRatioRef,
}: UseTransportRendererParams): UseTransportRendererReturn {
  // 씬 로딩 상태 관리
  const [sceneLoadingStates, setSceneLoadingStates] = useState<SceneLoadingStateMap>(new Map())
  const loadingScenesRef = useRef<Set<number>>(new Set())

  // 렌더링 최적화를 위한 ref
  const lastRenderedTRef = useRef<number>(-1)
  const lastRenderedSceneIndexRef = useRef<number>(-1)
  const lastRenderedSegmentIndexRef = useRef<number>(-1) // 이전 segmentIndex 추적 (TTS 파일 전환 감지용)
  const TIME_EPSILON = 0.01 // 시간 비교 정밀도 (10ms로 증가하여 불필요한 렌더링 방지)
  
  // 성능 최적화: 마지막 렌더링 상태 추적 (중복 렌더 스킵 강화)
  const lastRenderedStateRef = useRef<{
    t: number
    sceneIndex: number
    partIndex: number
    transitionProgress: number
    motionProgress: number
  } | null>(null)
  
  // Transition 로그 출력 추적 (중복 로그 방지)
  const lastTransitionLogRef = useRef<{
    sceneIndex: number
    progress: number
    logType: 'READY' | 'IN_PROGRESS' | 'COMPLETED' | null
  } | null>(null)

  // Container 관리
  const {
    sceneContainersRef,
    transitionQuadContainerRef,
    subtitleContainerRef,
    createSceneContainer, // eslint-disable-line @typescript-eslint/no-unused-vars
    getOrCreateSceneContainer,
    cleanupSceneContainer,
  } = useContainerManager(appRef, containerRef)

  // Transition Shader Manager (Shader 기반 Transition 관리)
  const transitionShaderManagerRef = useRef<TransitionShaderManager | null>(null)

  // Transition 효과 적용 훅
  const { applyShaderTransition, applyDirectTransition } = useTransitionEffects({
    timeline,
    appRef,
    containerRef,
    sceneContainersRef,
    transitionShaderManagerRef,
    fabricCanvasRef,
    fabricScaleRatioRef,
    stageDimensions,
  })

  /**
   * Base State 리셋 함수 래퍼 (ANIMATION.md 표준 파이프라인 4단계)
   * 매 프레임 sprite/text를 기본값으로 리셋하여 누적 업데이트/상태 누수 방지
   */
  const resetBaseStateCallback = useCallback((
    sprite: PIXI.Sprite | null,
    text: PIXI.Text | null,
    sceneIndex: number,
    scene: TimelineData['scenes'][number]
  ): void => {
    resetBaseState(
      sprite,
      text,
      sceneIndex,
      scene,
      fabricCanvasRef,
      fabricScaleRatioRef,
      stageDimensions
    )
  }, [stageDimensions, fabricCanvasRef, fabricScaleRatioRef])

  // Transition Shader Manager 초기화 함수 (renderAt에서도 호출됨)
  const ensureTransitionShaderManager = () => {
    if (appRef.current && !transitionShaderManagerRef.current) {
      transitionShaderManagerRef.current = new TransitionShaderManager(
        appRef.current,
        stageDimensions,
        spritesRef
      )
    }
  }

  // Transition Shader Manager 초기화 (app이 준비되면)
  useEffect(() => {
    ensureTransitionShaderManager()

    return () => {
      // 정리
      if (transitionShaderManagerRef.current) {
        transitionShaderManagerRef.current.destroy()
        transitionShaderManagerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageDimensions]) // appRef와 spritesRef는 ref이므로 의존성 배열에 포함하지 않음

  // Transport 상태 관리
  const { transportState } = useTransportState({ transport })

  /**
   * 단일 씬 로드 함수
   */
  const loadScene = useCallback(async (sceneIndex: number): Promise<void> => {
    if (!timeline || !appRef.current || !containerRef.current) {
      return
    }

    const scene = timeline.scenes[sceneIndex]
    if (!scene || !scene.image) {
      return
    }

    // 이미 로딩 중이거나 로드된 씬은 건너뛰기
    if (loadingScenesRef.current.has(sceneIndex)) {
      return
    }

    const currentState = sceneLoadingStates.get(sceneIndex)
    if (currentState === 'loaded') {
      return
    }

    // 로딩 시작
    loadingScenesRef.current.add(sceneIndex)
    setSceneLoadingStates((prev) => {
      const next = new Map(prev)
      next.set(sceneIndex, 'loading')
      return next
    })

    try {
      const container = containerRef.current
      const { width, height } = stageDimensions

      // 같은 그룹 내 씬들은 첫 번째 씬의 이미지와 스프라이트를 공유
      const firstSceneIndexInGroup =
        scene.sceneId !== undefined
          ? timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
          : -1
      const isFirstSceneInGroup = firstSceneIndexInGroup === sceneIndex

      // 첫 번째 씬이 아니고 같은 그룹 내에 스프라이트가 이미 있으면 공유
      if (!isFirstSceneInGroup && firstSceneIndexInGroup >= 0) {
        const firstSceneSprite = spritesRef.current.get(firstSceneIndexInGroup)
        if (firstSceneSprite) {
          spritesRef.current.set(sceneIndex, firstSceneSprite)
          setSceneLoadingStates((prev) => {
            const next = new Map(prev)
            next.set(sceneIndex, 'loaded')
            return next
          })
          loadingScenesRef.current.delete(sceneIndex)
          return
        }
      }

      // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
      const firstSceneInGroup =
        firstSceneIndexInGroup >= 0 ? timeline.scenes[firstSceneIndexInGroup] : null
      const imageToUse = firstSceneInGroup?.image || scene.image
      const baseScene = firstSceneInGroup || scene

      // 이미지 URL 유효성 검사
      if (!imageToUse || imageToUse.trim() === '') {
        // 이미지 URL이 없음 (로그 제거)
        setSceneLoadingStates((prev) => {
          const next = new Map(prev)
          next.set(sceneIndex, 'error')
          return next
        })
        loadingScenesRef.current.delete(sceneIndex)
        return
      }

      // 텍스처 로드
      let texture: PIXI.Texture | null = null
      try {
        texture = await loadPixiTextureWithCache(imageToUse)
      } catch {
        // 텍스처 로드 에러 (로그 제거)
      }

      // texture 유효성 검사 및 fallback 처리
      if (!texture) {
        // 텍스처 로드 실패, placeholder 사용 (로그 제거)
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#000000'
            ctx.fillRect(0, 0, 1, 1)
          }
          texture = PIXI.Texture.from(canvas)
        } catch {
          // Placeholder 생성 실패 (로그 제거)
          texture = PIXI.Texture.EMPTY
        }
      }

      // texture의 width와 height가 유효한지 확인
      if (!texture || typeof texture.width !== 'number' || typeof texture.height !== 'number' ||
          texture.width <= 0 || texture.height <= 0) {
        // 텍스처 크기가 유효하지 않음 (로그 제거)
        texture = PIXI.Texture.EMPTY
      }

      const sprite = new PIXI.Sprite(texture)
      sprite.anchor.set(0.5, 0.5)
      sprite.visible = false
      sprite.alpha = 0

      // Transform 데이터 적용
      if (baseScene.imageTransform) {
        sprite.x = baseScene.imageTransform.x
        sprite.y = baseScene.imageTransform.y
        sprite.width = baseScene.imageTransform.width
        sprite.height = baseScene.imageTransform.height
        sprite.rotation = baseScene.imageTransform.rotation
      } else {
        // Transform이 없으면 imageFit을 사용하여 스프라이트 크기/위치 계산
        const imageFit = baseScene.imageFit || 'contain'
        const textureWidth = texture.width > 0 ? texture.width : width
        const textureHeight = texture.height > 0 ? texture.height : height
        
        const params = calculateSpriteParams(
          textureWidth,
          textureHeight,
          width,
          height,
          imageFit
        )
        
        // anchor가 (0.5, 0.5)이므로 중심점 좌표로 변환
        sprite.x = params.x + params.width / 2
        sprite.y = params.y + params.height / 2
        sprite.width = params.width
        sprite.height = params.height
        sprite.rotation = 0
      }

      // 씬별 Container에 sprite 추가 (기존 containerRef 대신)
      const sceneContainer = getOrCreateSceneContainer(sceneIndex)
      sceneContainer.addChild(sprite)
      
      // 기존 containerRef에도 추가 (하위 호환성 유지, 나중에 제거 예정)
      container.addChild(sprite)
      spritesRef.current.set(sceneIndex, sprite)

      // 텍스트 객체 생성
      if (scene.text?.content) {
        const fontFamily = resolveSubtitleFontFamily(scene.text.font)
        const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)

        let textWidth = width
        if (scene.text.transform?.width) {
          textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
        }

        const textContent = (scene.text.content || '')
          .split(/\s*\|\|\|\s*/)
          .map((part) => (part && typeof part === 'string' ? part.trim() : ''))
          .filter((part) => part.length > 0)
        const displayText = textContent.length > 0 ? textContent[0] : scene.text.content

        const strokeColor = scene.text.stroke?.color || '#000000'
        const strokeWidth = getPreviewStrokeWidth(scene.text.stroke?.width, {
          fontSize: scene.text.fontSize,
        })
        const letterSpacing = getPreviewLetterSpacing(strokeWidth, {
          fontSize: scene.text.fontSize,
        })

        const styleConfig: Partial<PIXI.TextStyle> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          letterSpacing,
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
        }
        
        // stroke는 strokeWidth가 0보다 클 때만 설정
        if (strokeWidth > 0) {
          styleConfig.stroke = { color: strokeColor, width: strokeWidth }
        }
        
        const textStyle = new PIXI.TextStyle(styleConfig)

        const text = new PIXI.Text({
          text: displayText,
          style: textStyle,
        })

        // 중요: anchor를 (0, 0)으로 설정하여 Top-Left 기준으로 일관성 유지
        // 렌더링 시에도 항상 anchor를 (0, 0)으로 설정하므로, 저장된 좌표가 Top-Left 기준이어야 함
        text.anchor.set(0, 0)
        text.visible = false
        text.alpha = 0

        // 씬별 Container에 text 추가 (기존 containerRef 대신)
        const sceneContainer = getOrCreateSceneContainer(sceneIndex)
        sceneContainer.addChild(text)
        
        // 기존 containerRef에도 추가 (하위 호환성 유지, 나중에 제거 예정)
        // 텍스트를 컨테이너에 먼저 추가하여 렌더러가 텍스트를 렌더링할 수 있도록 함
        // 이렇게 하면 requestAnimationFrame 내부에서 getLocalBounds()가 정확한 값을 반환할 수 있음
        container.addChild(text)

        // 텍스트 Transform 적용
        if (scene.text.transform) {
          const scaleX = scene.text.transform.scaleX ?? 1
          const scaleY = scene.text.transform.scaleY ?? 1
          
          // Transform이 있을 때는 normalizeAnchorToTopLeft로 계산된 Top-Left 좌표를 사용 (ANIMATION.md 6.2)
          const transform = scene.text.transform
          const anchorX = transform.anchor?.x ?? 0.5
          const anchorY = transform.anchor?.y ?? 0.5
          
          // Anchor→TopLeft 정규화 (ANIMATION.md 6.2)
          const { boxX, boxY, boxW, boxH } = normalizeAnchorToTopLeft(
            transform.x,
            transform.y,
            transform.width,
            transform.height,
            scaleX,
            scaleY,
            anchorX,
            anchorY
          )
          
          // 텍스트 실제 크기 계산 (PIXI.Text의 getLocalBounds 사용)
          // 스타일이 설정된 후이므로 bounds를 계산할 수 있음
          // 하지만 텍스트가 아직 렌더링되지 않았을 수 있으므로 requestAnimationFrame에서 위치 설정
          const hAlign = transform.hAlign ?? 'center'
          
          // 텍스트 위치는 렌더링 후 정확한 크기를 얻을 수 있도록 requestAnimationFrame에서 설정
          // 두 번의 requestAnimationFrame을 사용하여 렌더러가 텍스트를 렌더링할 시간을 줌
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // text가 null이거나 destroyed 상태인지 확인
              if (!text || text.destroyed) {
                return
              }
              
              // 렌더러가 텍스트를 렌더링하도록 강제
              // 텍스트를 임시로 보이게 하여 렌더러가 텍스트를 렌더링하도록 함
              const wasVisible = text.visible
              const wasAlpha = text.alpha
              text.visible = true
              text.alpha = 0.01 // 거의 보이지 않지만 렌더링은 수행됨
              
              // 앱 렌더러를 직접 호출하여 텍스트를 렌더링
              if (appRef.current?.renderer && containerRef.current) {
                try {
                  appRef.current.renderer.render(containerRef.current)
                } catch (_renderError) {
                  // 렌더러 호출 실패 시 무시
                }
              }
              
              // 텍스트 크기 측정
              const textBounds = text.getLocalBounds()
              let measuredTextWidth = textBounds.width || 0
              let measuredTextHeight = textBounds.height || 0
              
              // 크기가 여전히 0이면 텍스트를 다시 설정하고 재측정
              if (measuredTextWidth === 0 || measuredTextHeight === 0) {
                const currentText = text.text
                text.text = currentText
                if (appRef.current?.renderer && containerRef.current) {
                  try {
                    appRef.current.renderer.render(containerRef.current)
                  } catch (_renderError) {
                    // 렌더러 재호출 실패 시 무시
                  }
                }
                const retryBounds = text.getLocalBounds()
                measuredTextWidth = retryBounds.width || 0
                measuredTextHeight = retryBounds.height || 0
              }
              
              // 원래 상태로 복원
              text.visible = wasVisible
              text.alpha = wasAlpha
              
              // 박스 내부 정렬 계산 (ANIMATION.md 6.3) — 박스와 동일 좌표계(스테이지)로 텍스트 스케일 반영
              const { textX, textY } = calculateTextPositionInBox(
                boxX,
                boxY,
                boxW,
                boxH,
                measuredTextWidth * scaleX,
                measuredTextHeight * scaleY,
                hAlign
              )
              
              text.x = textX
              text.y = textY
            })
          })
          
          text.scale.set(scaleX, scaleY)
          text.rotation = scene.text.transform.rotation ?? 0

          if (text.style && scene.text.transform.width) {
            const baseWidth = scene.text.transform.width / scaleX
            text.style.wordWrapWidth = baseWidth
            text.text = text.text
          }
        } else {
          // Transform이 없을 때: anchor (0.5, 0.5)로 고정하고 텍스트 중앙이 subtitlePosition.x에 오도록 설정
          const subtitlePosition = getSubtitlePosition(scene, stageDimensions)
          
          // anchor를 (0.5, 0.5)로 고정: 텍스트의 중앙이 기준점이 됨
          text.anchor.set(0.5, 0.5)
          
          // 텍스트의 중앙이 subtitlePosition.x, y에 오도록 설정
          // anchor가 (0.5, 0.5)이므로 text.x는 텍스트의 중앙 위치
          text.x = subtitlePosition.x
          text.y = subtitlePosition.y
          text.scale.set(subtitlePosition.scaleX ?? 1, subtitlePosition.scaleY ?? 1)
          text.rotation = subtitlePosition.rotation ?? 0
        }
        textsRef.current.set(sceneIndex, text)

        // 밑줄 렌더링
        if (scene.text.style?.underline) {
          requestAnimationFrame(() => {
            const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
            const textColor = scene.text.color || '#ffffff'
            const colorValue = textColor.startsWith('#')
              ? parseInt(textColor.slice(1), 16)
              : 0xffffff

            const bounds = text.getLocalBounds()
            const underlineWidth = bounds.width || textWidth

            const underline = new PIXI.Graphics()
            ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

            const halfWidth = underlineWidth / 2
            const yPos = bounds.height / 2 + underlineHeight * 0.25

            underline.lineStyle(underlineHeight, colorValue, 1)
            underline.moveTo(-halfWidth, yPos)
            underline.lineTo(halfWidth, yPos)
            underline.stroke()

            text.addChild(underline)
          })
        }
      }

      setSceneLoadingStates((prev) => {
        const next = new Map(prev)
        next.set(sceneIndex, 'loaded')
        return next
      })
      loadingScenesRef.current.delete(sceneIndex)

      if (onSceneLoadComplete) {
        onSceneLoadComplete(sceneIndex)
      }
    } catch {
      // 씬 로드 실패 (로그 제거)
      setSceneLoadingStates((prev) => {
        const next = new Map(prev)
        next.set(sceneIndex, 'error')
        return next
      })
      loadingScenesRef.current.delete(sceneIndex)
    }
  }, [
    timeline,
    appRef,
    containerRef,
    spritesRef,
    textsRef,
    stageDimensions,
    loadPixiTextureWithCache,
    sceneLoadingStates,
    onSceneLoadComplete,
    getOrCreateSceneContainer,
  ])

  /**
   * 모든 씬 로드
   */
  const loadAllScenes = useCallback(async (): Promise<void> => {
    if (!timeline || !appRef.current || !containerRef.current) {
      return
    }

    const container = containerRef.current

    // 기존 객체들 정리
    const children = Array.from(container.children)
    children.forEach((child) => {
      try {
        if (child.parent) {
          child.parent.removeChild(child)
        }
        child.destroy({ children: true })
      } catch {
        // Error destroying child (로그 제거)
      }
    })
    container.removeChildren()

    spritesRef.current.forEach((sprite) => {
      try {
        if (sprite && sprite.parent) {
          sprite.parent.removeChild(sprite)
        }
        if (sprite) {
          sprite.destroy({ children: true })
        }
      } catch {
        // Error destroying sprite (로그 제거)
      }
    })
    spritesRef.current.clear()

    // 씬별 Container 정리
    sceneContainersRef.current.forEach((sceneContainer, sceneIndex) => {
      try {
        cleanupSceneContainer(sceneIndex)
      } catch {
        // Error cleaning up scene container (로그 제거)
      }
    })
    sceneContainersRef.current.clear()

    // 자막 Container 정리
    if (subtitleContainerRef.current) {
      try {
        subtitleContainerRef.current.removeChildren()
        // Container 자체는 유지 (재사용)
      } catch {
        // Error cleaning up subtitle container (로그 제거)
      }
    }

    // Transition Quad Container 정리
    if (transitionQuadContainerRef.current) {
      try {
        transitionQuadContainerRef.current.removeChildren()
        // Container 자체는 유지 (재사용)
      } catch {
        // Error cleaning up transition quad container (로그 제거)
      }
    }

    textsRef.current.forEach((text) => {
      try {
        if (text && text.parent) {
          text.parent.removeChild(text)
        }
        if (text) {
          text.destroy({ children: true })
        }
      } catch {
        // Error destroying text (로그 제거)
      }
    })
    textsRef.current.clear()

    // 모든 씬 로드
    await Promise.all(timeline.scenes.map((_, index) => loadScene(index)))
  }, [timeline, appRef, containerRef, spritesRef, textsRef, loadScene, cleanupSceneContainer, sceneContainersRef, subtitleContainerRef, transitionQuadContainerRef])

  // 자막 렌더링
  const {
    renderSubtitlePart,
    normalizeAnchorToTopLeft,
    calculateTextPositionInBox,
  } = useSubtitleRenderer({
    timeline: timeline!,
    appRef,
    containerRef,
    subtitleContainerRef,
    textsRef,
    stageDimensions,
  })

  /**
   * 자막 렌더링 헬퍼 함수 (레거시 - useSubtitleRenderer로 대체됨)
   * @deprecated useSubtitleRenderer의 renderSubtitlePart를 사용하세요
   */
  const _renderSubtitlePartLegacy = useCallback(
    (sceneIndex: number, partIndex: number | null, options?: { skipAnimation?: boolean; onComplete?: () => void }) => {
      if (!timeline || !appRef.current) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      const originalText = scene.text?.content || ''
      const scriptParts = splitSubtitleByDelimiter(originalText)
      const hasSegments = scriptParts.length > 1

      let partText: string | null = null
      if (partIndex === null) {
        if (hasSegments) {
          partText = scriptParts[0]?.trim() || originalText
        } else {
          partText = originalText
        }
      } else {
        if (partIndex >= 0 && partIndex < scriptParts.length) {
          partText = scriptParts[partIndex]?.trim() || null
        } else {
          if (scriptParts.length > 0) {
            partText = scriptParts[0]?.trim() || null
          } else {
            partText = originalText
          }
        }
      }

      if (!partText) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 같은 그룹 내 모든 텍스트를 먼저 숨김 (겹침 방지)
      // 같은 그룹 내에서 텍스트 객체를 공유하는 경우를 고려
      const sceneId = scene.sceneId
      if (sceneId !== undefined) {
        // 같은 그룹 내 모든 씬 인덱스 찾기
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
          .filter((idx) => idx >= 0)
        
        // 같은 그룹 내 모든 텍스트 객체 숨김
        sameGroupSceneIndices.forEach((groupSceneIndex) => {
          const groupTextObj = textsRef.current.get(groupSceneIndex)
          if (groupTextObj && !groupTextObj.destroyed) {
            groupTextObj.visible = false
          }
        })
      } else {
        // sceneId가 없으면 모든 텍스트 숨김
        textsRef.current.forEach((textObj) => {
          if (!textObj.destroyed) {
            textObj.visible = false
          }
        })
      }
      
      // 텍스트 객체 찾기
      // 분할된 씬(splitIndex가 있는 경우)의 경우 각 씬 인덱스별로 별도 텍스트 객체를 사용
      // 분할되지 않은 씬의 경우 같은 그룹 내에서 텍스트 객체를 공유할 수 있음
      let targetTextObj: PIXI.Text | null = null
      
      // 분할된 씬의 경우 현재 씬 인덱스의 텍스트 객체를 우선 사용
      if (scene.splitIndex !== undefined) {
        targetTextObj = textsRef.current.get(sceneIndex) || null
        
        // 분할된 씬인데 텍스트 객체가 없으면 같은 그룹 내 다른 씬의 텍스트 객체를 찾아서 사용
        // 단, 분할된 씬은 각각 별도의 텍스트 객체를 가져야 하므로, 아직 생성되지 않았을 경우 임시로 사용
        if (!targetTextObj && sceneId !== undefined) {
          // 같은 그룹 내 모든 씬 인덱스 찾기
          const sameGroupSceneIndices = timeline.scenes
            .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
            .filter((idx) => idx >= 0 && idx !== sceneIndex)
          
          // 같은 그룹 내 씬들 중 텍스트 객체가 있는 첫 번째 씬 찾기
          for (const groupSceneIndex of sameGroupSceneIndices) {
            const groupTextObj = textsRef.current.get(groupSceneIndex)
            if (groupTextObj && !groupTextObj.destroyed) {
              // 분할된 씬은 별도의 텍스트 객체가 필요하지만, 아직 생성되지 않았을 경우
              // 같은 그룹 내 다른 씬의 텍스트 객체를 임시로 사용 (렌더링 보장)
              targetTextObj = groupTextObj
              break
            }
          }
        }
      } else {
        // 분할되지 않은 씬의 경우 현재 씬 인덱스의 텍스트 객체를 우선 사용
        targetTextObj = textsRef.current.get(sceneIndex) || null
        
        // 현재 씬 인덱스의 텍스트 객체가 없으면 같은 그룹 내 첫 번째 씬 인덱스의 텍스트 객체 사용
        if (!targetTextObj) {
          if (sceneId !== undefined) {
            const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
            if (firstSceneIndexInGroup >= 0) {
              targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
            }
          }
        }
      }
      
      // 다른 씬의 텍스트 객체는 사용하지 않음 (자막 누적 방지)
      // 현재 씬의 텍스트 객체를 찾지 못했으면 조기 종료
      if (!targetTextObj) {
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 텍스트 객체를 찾지 못했거나 파괴된 경우 조기 종료
      if (!targetTextObj || targetTextObj.destroyed) {
        // 텍스트 객체를 찾을 수 없음 (로그 제거)
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 텍스트 객체를 자막 Container에 추가 (Shader Transition을 위한 분리)
      if (subtitleContainerRef.current) {
        // 이전 부모에서 제거
        if (targetTextObj.parent && targetTextObj.parent !== subtitleContainerRef.current) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        // 자막 Container에 추가
        if (!targetTextObj.parent) {
          subtitleContainerRef.current.addChild(targetTextObj)
        }
      } else if (containerRef.current) {
        // 자막 Container가 없으면 기존 방식 사용 (하위 호환성)
        // 이전 부모에서 제거
        if (targetTextObj.parent && targetTextObj.parent !== containerRef.current) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        // 컨테이너에 추가 (최상위 레이어로)
        if (!targetTextObj.parent) {
          containerRef.current.addChild(targetTextObj)
        }
        // 텍스트는 항상 최상위 레이어
        const currentIndex = containerRef.current.getChildIndex(targetTextObj)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(targetTextObj, maxIndex)
        }
      }

      // 텍스트 업데이트
      targetTextObj.text = partText

      // 자막 스타일 업데이트
      if (scene.text) {
        const textObj = targetTextObj
        const fontFamily = resolveSubtitleFontFamily(scene.text.font)
        const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)

        const stageWidth = appRef.current?.screen?.width || 1080
        let textWidth = stageWidth
        if (scene.text.transform?.width) {
          textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
        }

        const strokeColor = scene.text.stroke?.color || '#000000'
        const strokeWidth = getPreviewStrokeWidth(scene.text.stroke?.width, {
          fontSize: scene.text.fontSize,
        })
        const letterSpacing = getPreviewLetterSpacing(strokeWidth, {
          fontSize: scene.text.fontSize,
        })

        const styleConfig: Partial<PIXI.TextStyle> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          letterSpacing,
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
        }
        
        // stroke는 strokeWidth가 0보다 클 때만 설정
        if (strokeWidth > 0) {
          styleConfig.stroke = { color: strokeColor, width: strokeWidth }
        }

        const textStyle = new PIXI.TextStyle(styleConfig)
        textObj.style = textStyle

        // 텍스트 Transform 적용 (ANIMATION.md 박스+정렬 규칙)
        // 텍스트 스타일이 설정된 후에 bounds를 계산할 수 있도록 여기서 처리
        if (scene.text.transform) {
          const transform = scene.text.transform
          const scaleX = transform.scaleX ?? 1
          const scaleY = transform.scaleY ?? 1
          
          // Anchor 및 정렬 기본값 설정
          // 구 데이터(앵커 누락)는 center-origin으로 저장된 경우가 많아 (0.5, 0.5)를 기본값으로 사용
          const anchorX = transform.anchor?.x ?? 0.5
          const anchorY = transform.anchor?.y ?? 0.5
          const hAlign = transform.hAlign ?? 'center'
          // vAlign은 middle 고정 (ANIMATION.md 6.3)
          
          // Anchor→TopLeft 정규화 (ANIMATION.md 6.2)
          const { boxX, boxY, boxW, boxH } = normalizeAnchorToTopLeft(
            transform.x,
            transform.y,
            transform.width,
            transform.height,
            scaleX,
            scaleY,
            anchorX,
            anchorY
          )
          
          // 텍스트 실제 크기 계산 (PIXI.Text의 getLocalBounds 사용)
          // 스타일이 설정된 후이므로 bounds를 계산할 수 있음
          const textBounds = textObj.getLocalBounds()
          const measuredTextWidth = textBounds.width || 0
          const measuredTextHeight = textBounds.height || 0
          
          // 박스 내부 정렬 계산 (ANIMATION.md 6.3)
          // vAlign은 middle 고정이므로 파라미터로 전달하지 않음
          const { textX, textY } = calculateTextPositionInBox(
            boxX,
            boxY,
            boxW,
            boxH,
            measuredTextWidth,
            measuredTextHeight,
            hAlign
          )
          
          // 디버깅 로그 제거: 렌더링 시점의 로그는 실제 서버 전송 값과 다를 수 있음
          // 실제 서버 전송 값은 useVideoExport.ts의 로그를 확인하세요
          
          // PIXI.Text의 anchor를 (0, 0)으로 설정하고 계산된 위치 사용
          textObj.anchor.set(0, 0)
          textObj.x = textX
          textObj.y = textY
          textObj.scale.set(scaleX, scaleY)
          textObj.rotation = transform.rotation ?? 0
        } else {
          // transform이 없을 때 공통 함수 사용
          const subtitlePosition = getSubtitlePosition(scene, stageDimensions)
          
          // transform이 없을 때도 anchor를 (0, 0)으로 설정하여 일관성 유지
          // getSubtitlePosition이 반환하는 좌표는 중앙 기준이므로, 텍스트 크기를 고려하여 Top-Left 좌표로 변환
          textObj.anchor.set(0, 0)
          
          // 텍스트 실제 크기 계산
          const textBounds = textObj.getLocalBounds()
          const measuredTextWidth = textBounds.width || 0
          const measuredTextHeight = textBounds.height || 0
          
          // 중앙 기준 좌표를 Top-Left 좌표로 변환
          const textX = subtitlePosition.x - measuredTextWidth / 2
          const textY = subtitlePosition.y - measuredTextHeight / 2
          
          textObj.x = textX
          textObj.y = textY
          textObj.scale.set(subtitlePosition.scaleX, subtitlePosition.scaleY)
          textObj.rotation = subtitlePosition.rotation
        }

        // 밑줄 렌더링 (Transform 적용 후에 처리)
        const removeUnderline = () => {
          const underlineChildren = textObj.children.filter(
            (child) => child instanceof PIXI.Graphics && (child as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline
          )
          underlineChildren.forEach((child) => textObj.removeChild(child))
        }
        removeUnderline()
        if (scene.text.style?.underline) {
          requestAnimationFrame(() => {
            const underlineHeight = Math.max(2, (scene.text.fontSize || 80) * 0.05)
            const textColor = scene.text.color || '#ffffff'
            const colorValue = textColor.startsWith('#')
              ? parseInt(textColor.slice(1), 16)
              : 0xffffff

            const bounds = textObj.getLocalBounds()
            const underlineWidth = bounds.width || textWidth

            const underline = new PIXI.Graphics()
            ;(underline as PIXI.Graphics & { __isUnderline?: boolean }).__isUnderline = true

            const halfWidth = underlineWidth / 2
            const yPos = bounds.height / 2 + underlineHeight * 0.25

            underline.lineStyle(underlineHeight, colorValue, 1)
            underline.moveTo(-halfWidth, yPos)
            underline.lineTo(halfWidth, yPos)
            underline.stroke()

            textObj.addChild(underline)
          })
        }
      }

      // 표시
      targetTextObj.visible = true
      targetTextObj.alpha = 1
      
      // 텍스트 표시 후 다시 한 번 같은 그룹 내 다른 텍스트 숨김 (겹침 방지)
      if (sceneId !== undefined) {
        const sameGroupSceneIndices = timeline.scenes
          .map((s, idx) => (s.sceneId === sceneId ? idx : -1))
          .filter((idx) => idx >= 0 && idx !== sceneIndex)
        
        sameGroupSceneIndices.forEach((groupSceneIndex) => {
          const groupTextObj = textsRef.current.get(groupSceneIndex)
          if (groupTextObj && !groupTextObj.destroyed && groupTextObj !== targetTextObj) {
            groupTextObj.visible = false
          }
        })
      }

      if (options?.onComplete) {
        options.onComplete()
      }
    },
    [timeline, appRef, containerRef, textsRef, normalizeAnchorToTopLeft, calculateTextPositionInBox, subtitleContainerRef]
  )

  /**
   * renderAt(t) - 타임라인 시간 t에 해당하는 프레임을 결정적으로 렌더링
   * 
   * 핵심 원칙:
   * 1. 매 프레임마다 canvas를 비우고 현재 씬/구간만 새로 렌더링 (결정적 렌더링)
   * 2. 씬이 로드되지 않았으면 사전 로드
   * 3. 씬이 로드된 후에만 이미지/자막 렌더링
   * 4. GSAP 애니메이션을 Transport `t`에 동기화
   * 
   * 이 접근 방식의 장점:
   * - 상태 관리 단순화 (이전 상태 추적 불필요)
   * - 누적 문제 방지 (자막/이미지가 쌓이지 않음)
   * - 순수 함수처럼 동작 (같은 t에 대해 항상 같은 결과)
   */
  const renderAt = useCallback(
    (tSec: number, options?: RenderAtOptions) => {
      // ============================================================
      // ANIMATION.md 표준 파이프라인 8단계
      // ============================================================
      
      
      // 초기 검증
      if (!timeline || !appRef.current) {
        return
      }
      if (!timeline.scenes || timeline.scenes.length === 0) {
        return
      }

      // Transition Shader Manager 초기화 확인 (renderAt 호출 시점에 확인)
      ensureTransitionShaderManager()

      // 파이프라인 컨텍스트 생성
      const pipelineContext: PipelineContext = {
        timeline,
        tSec,
        options,
        appRef,
        containerRef,
        spritesRef,
        textsRef,
        currentSceneIndexRef,
        previousSceneIndexRef,
        lastRenderedTRef,
        lastRenderedSceneIndexRef,
        lastRenderedSegmentIndexRef,
        lastRenderedStateRef,
        lastTransitionLogRef,
        sceneContainersRef,
        subtitleContainerRef,
        transitionQuadContainerRef,
        transitionShaderManagerRef,
        fabricCanvasRef,
        fabricScaleRatioRef,
        sceneLoadingStates,
        loadScene,
        resetBaseStateCallback,
        applyShaderTransition,
        applyDirectTransition,
        renderSubtitlePart,
        getActiveSegment,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
        stageDimensions,
        TIME_EPSILON,
      }

      // ============================================================
      // 1단계: 씬/파트 계산
      // ============================================================
      // 재생 중이 아닐 때 (playingSceneIndex === null) 수동 선택된 씬 우선 사용
      // 씬 클릭 시 currentSceneIndexRef가 업데이트되지만 transport.currentTime이 아직 업데이트되지 않아서
      // 시간 기반 계산이 이전 씬을 반환하는 문제 방지
      // 중요: options에 이미 forceSceneIndex가 있으면 덮어쓰지 않음 (명시적 지정 우선)
      if (!options?.forceSceneIndex && playingSceneIndex === null && playingGroupSceneId === null) {
        const manualSceneIndex = currentSceneIndexRef.current
        if (manualSceneIndex >= 0 && manualSceneIndex < timeline.scenes.length) {
          // 수동 선택된 씬이 있으면 forceSceneIndex로 사용
          // pipelineContext.options를 직접 수정하여 step1CalculateScenePart에서 사용되도록 함
          if (!pipelineContext.options) {
            pipelineContext.options = {}
          }
          pipelineContext.options.forceSceneIndex = manualSceneIndex
        }
      }
      
      const step1Result = step1CalculateScenePart(pipelineContext)
      if (!step1Result) {
        return
      }
      let { sceneIndex, partIndex } = step1Result

      // ============================================================
      // 8단계: 중복 렌더 스킵 (조기 반환 체크)
      // ============================================================
      const step8Result = step8CheckDuplicateRender(pipelineContext, step1Result)
      
      // Step 8에서 sceneIndex/partIndex가 업데이트될 수 있음
      sceneIndex = step8Result.sceneIndex
      partIndex = step8Result.partIndex

      // 조기 반환 체크
      // 단, 자막은 매 프레임마다 업데이트되어야 하므로 shouldSkip과 관계없이 렌더링 필요
      // step4에서 text.visible = false, text.alpha = 0으로 리셋하므로,
      // step7을 스킵하면 자막이 계속 숨겨진 상태로 남아있게 됨
      const shouldSkipMainRendering = step8Result.shouldSkip

      const scene = timeline.scenes[sceneIndex]
      if (!scene) {
        return
      }

      // 현재 씬 인덱스 업데이트
      // 씬 전환 시 불필요한 렌더링 방지: previousSceneIndexRef를 먼저 업데이트하여 씬1이 잠깐 렌더링되는 버그 방지
      const previousSceneIndex = currentSceneIndexRef.current
      if (previousSceneIndex !== sceneIndex) {
        // 씬이 변경될 때만 previousSceneIndexRef 업데이트
        previousSceneIndexRef.current = previousSceneIndex
        currentSceneIndexRef.current = sceneIndex
      } else {
        // 같은 씬이면 currentSceneIndexRef만 업데이트
        currentSceneIndexRef.current = sceneIndex
      }

      // ============================================================
      // 2단계: 리소스 준비 (로드/캐시)
      // ============================================================
      const step2Result = step2PrepareResources(pipelineContext, sceneIndex)
      if (!step2Result.shouldContinue) {
        return
      }
      const { sprite, sceneText } = step2Result

      // ============================================================
      // 3단계: 컨테이너 구성 보장
      // ============================================================
      if (!step3SetupContainers(pipelineContext, sceneIndex, sprite, sceneText, step8Result)) {
        return
      }

      // ============================================================
      // 4단계: Base State 리셋 (ANIMATION.md 표준: 매 프레임 항상 실행)
      // ============================================================
      step4ResetBaseState(pipelineContext, sprite || null, sceneText || null, sceneIndex, scene)

      // ============================================================
      // 5단계: Motion 적용
      // ============================================================
      let step5Result
      if (shouldSkipMainRendering) {
        // 중복 렌더링이면 기본값 사용 (자막 렌더링을 위해 최소한의 값만 필요, TTS 기준 sceneStartTime 사용)
        const sceneStartTime = step8Result.sceneStartTime
        const sceneLocalT = Math.max(0, tSec - sceneStartTime)
        step5Result = { motionProgress: 0, spriteAfterMotion: null, sceneLocalT, sceneStartTime }
      } else {
        step5Result = step5ApplyMotion(pipelineContext, sceneIndex, scene, sprite || null, step8Result)
      }

      // ============================================================
      // 6단계: Transition 적용
      // ============================================================
      if (!shouldSkipMainRendering) {
        step6ApplyTransition(pipelineContext, sceneIndex, scene, sceneText, step8Result)
      }

      // ============================================================
      // 7단계: 자막 적용
      // ============================================================
      // 자막은 매 프레임마다 업데이트되어야 하므로 중복 렌더 체크와 관계없이 항상 실행
      // step4에서 text.visible = false, text.alpha = 0으로 리셋하므로,
      // step7을 스킵하면 자막이 계속 숨겨진 상태로 남아있게 됨
      // Transition 진행 중에도 자막이 표시되어야 하므로 항상 실행
      if (scene.text?.content) {
        step7ApplySubtitle(
          pipelineContext,
          sceneIndex,
          partIndex,
          scene,
          sprite || null,
          step5Result.spriteAfterMotion,
          step5Result.sceneLocalT
        )
      }
       
    },
    [
        timeline,
        appRef,
        containerRef,
        spritesRef,
        textsRef,
        currentSceneIndexRef,
        previousSceneIndexRef,
        renderSubtitlePart,
        ttsCacheRef,
        voiceTemplate,
        buildSceneMarkup,
        makeTtsKey,
        getActiveSegment,
        sceneLoadingStates,
        loadScene,
        resetBaseStateCallback,
        applyShaderTransition,
        applyDirectTransition,
        stageDimensions,
        fabricCanvasRef,
        fabricScaleRatioRef,
        sceneContainersRef,
        subtitleContainerRef,
        transitionQuadContainerRef,
    ]
  )

  // 렌더링 루프 (재생 중일 때만)
  useRenderLoop({
    transport,
    transportState,
    renderAt,
    playingSceneIndex,
    playingGroupSceneId,
  })

  // 렌더링 캐시 리셋 함수 (TTS duration 변경 시 사용)
  const resetRenderCache = useCallback(() => {
    lastRenderedTRef.current = -1
    lastRenderedSceneIndexRef.current = -1
    lastRenderedSegmentIndexRef.current = -1
    lastRenderedStateRef.current = null
  }, [])

  return {
    renderAt,
    sceneLoadingStates,
    loadScene,
    loadAllScenes,
    resetRenderCache,
  }
}
