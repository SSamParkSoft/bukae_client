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

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { useSyncExternalStore } from 'react'
import * as PIXI from 'pixi.js'
import { calculateSceneFromTime } from '@/utils/timeline-render'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import type {
  UseTransportRendererParams,
  UseTransportRendererReturn,
  RenderAtOptions,
  SceneLoadingStateMap,
} from './types'

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
  activeAnimationsRef,
  stageDimensions,
  ttsCacheRef,
  voiceTemplate,
  buildSceneMarkup,
  makeTtsKey,
  loadPixiTextureWithCache,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyEnterEffect: _applyEnterEffect, // 타입 정의에 포함되어 있지만 현재 사용하지 않음
  onSceneLoadComplete,
}: UseTransportRendererParams): UseTransportRendererReturn {
  // 씬 로딩 상태 관리
  const [sceneLoadingStates, setSceneLoadingStates] = useState<SceneLoadingStateMap>(new Map())
  const loadingScenesRef = useRef<Set<number>>(new Set())

  // 렌더링 최적화를 위한 ref
  const lastRenderTimeRef = useRef<number>(0)
  const lastRenderedTRef = useRef<number>(-1)
  const lastRenderedSceneIndexRef = useRef<number>(-1)
  const RENDER_THROTTLE_MS = 16 // ~60fps
  const TIME_EPSILON = 0.001 // 시간 비교 정밀도 (1ms)

  // Transport currentTime 구독 (렌더링 최적화를 위해 별도로 관리)
  const transportTimeRef = useRef<number>(0)
  const lastSnapshotRef = useRef<number>(0)
  
  const getTransportTimeSnapshot = useCallback(() => {
    if (!transport) {
      return 0
    }
    const newTime = transport.getTime()
    // 소수점 3자리까지 반올림하여 안정적인 값 반환
    const roundedTime = Math.round(newTime * 1000) / 1000
    
    // 이전 값과 같으면 이전 값 반환 (참조 안정화)
    if (roundedTime === lastSnapshotRef.current) {
      return lastSnapshotRef.current
    }
    
    transportTimeRef.current = roundedTime
    lastSnapshotRef.current = roundedTime
    return roundedTime
  }, [transport])

  const transportCurrentTime = useSyncExternalStore(
    (onStoreChange) => {
      if (!transport) {
        return () => {}
      }
      return transport.subscribe(() => {
        onStoreChange()
      }, true)
    },
    getTransportTimeSnapshot,
    () => 0
  )

  // Transport 상태 구독
  const transportStateRef = useRef(transport?.getState() || null)
  const transportRef = useRef(transport)
  
  // transport ref 업데이트
  useEffect(() => {
    transportRef.current = transport
  }, [transport])

  // getServerSnapshot을 상수로 캐싱하여 무한 루프 방지
  const defaultTransportState = useMemo(
    () => ({ isPlaying: false, timelineOffsetSec: 0, audioCtxStartSec: 0, playbackRate: 1.0, totalDuration: 0 }),
    []
  )

  // defaultTransportState를 ref에 저장하여 항상 같은 참조 유지
  const defaultStateRef = useRef(defaultTransportState)
  useEffect(() => {
    defaultStateRef.current = defaultTransportState
  }, [defaultTransportState])

  // getSnapshot을 안정적인 참조로 캐싱 (transport 변경 시에도 같은 함수 참조 유지)
  // 중요한 점: 같은 상태면 항상 같은 객체 참조를 반환해야 함
  const getTransportStateSnapshot = useCallback(() => {
    const currentTransport = transportRef.current
    if (!currentTransport) {
      // transport가 없으면 기본 상태 반환 (항상 같은 참조)
      if (!transportStateRef.current) {
        transportStateRef.current = defaultStateRef.current
      }
      return transportStateRef.current
    }
    const newState = currentTransport.getState()
    
    // 상태가 변경되지 않았으면 이전 참조 반환 (중요!)
    if (transportStateRef.current &&
        transportStateRef.current.isPlaying === newState.isPlaying &&
        transportStateRef.current.timelineOffsetSec === newState.timelineOffsetSec &&
        transportStateRef.current.audioCtxStartSec === newState.audioCtxStartSec &&
        transportStateRef.current.playbackRate === newState.playbackRate &&
        transportStateRef.current.totalDuration === newState.totalDuration) {
      return transportStateRef.current
    }
    
    // 상태가 변경되었으면 새 상태 저장 및 반환
    transportStateRef.current = newState
    return newState
  }, []) // 의존성 배열 비움 - transport는 ref로 접근

  const transportState = useSyncExternalStore(
    (onStoreChange) => {
      const currentTransport = transportRef.current
      if (!currentTransport) {
        return () => {}
      }
      return currentTransport.subscribe(() => {
        onStoreChange()
      }, true)
    },
    getTransportStateSnapshot,
    () => defaultStateRef.current
  )

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
        const imageY = height * 0.15
        sprite.x = width * 0.5
        sprite.y = imageY + (height * 0.7) * 0.5
        sprite.width = width
        sprite.height = height * 0.7
        sprite.rotation = 0
      }

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

        const styleConfig: Record<string, unknown> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
          stroke: { color: '#000000', width: 10 },
        }
        const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)

        const text = new PIXI.Text({
          text: displayText,
          style: textStyle,
        })

        text.anchor.set(0.5, 0.5)
        text.visible = false
        text.alpha = 0

        // 텍스트 Transform 적용
        if (scene.text.transform) {
          const scaleX = scene.text.transform.scaleX ?? 1
          const scaleY = scene.text.transform.scaleY ?? 1
          text.x = scene.text.transform.x
          text.y = scene.text.transform.y
          text.scale.set(scaleX, scaleY)
          text.rotation = scene.text.transform.rotation ?? 0

          if (text.style && scene.text.transform.width) {
            const baseWidth = scene.text.transform.width / scaleX
            text.style.wordWrapWidth = baseWidth
            text.text = text.text
          }
        } else {
          const position = scene.text.position || 'bottom'
          const textY =
            position === 'top'
              ? height * 0.15
              : position === 'bottom'
                ? height * 0.85
                : height * 0.5
          text.x = width / 2
          text.y = textY
          text.scale.set(1, 1)
          text.rotation = 0
        }

        container.addChild(text)
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
  }, [timeline, appRef, containerRef, spritesRef, textsRef, loadScene])

  /**
   * 자막 렌더링 헬퍼 함수
   */
  const renderSubtitlePart = useCallback(
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

      // 텍스트 객체 찾기
      let targetTextObj: PIXI.Text | null = null
      const sceneId = scene.sceneId
      if (sceneId !== undefined) {
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
        if (firstSceneIndexInGroup >= 0) {
          targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
        }
      }

      if (!targetTextObj) {
        targetTextObj = textsRef.current.get(sceneIndex) || null
      }

      // 텍스트 객체를 찾지 못한 경우 추가 검색
      if (!targetTextObj) {
        if (sceneId !== undefined) {
          timeline.scenes.forEach((s, idx) => {
            if (s.sceneId === sceneId && !targetTextObj) {
              const text = textsRef.current.get(idx)
              if (text) {
                targetTextObj = text
              }
            }
          })
        }

        if (!targetTextObj) {
          for (let i = 0; i < timeline.scenes.length; i++) {
            const text = textsRef.current.get(i)
            if (text) {
              targetTextObj = text
              break
            }
          }
        }

        if (!targetTextObj && containerRef.current) {
          containerRef.current.children.forEach((child) => {
            if (child instanceof PIXI.Text && !targetTextObj) {
              targetTextObj = child
            }
          })
        }
      }

      // 텍스트 객체를 찾지 못했거나 파괴된 경우 조기 종료
      if (!targetTextObj || targetTextObj.destroyed) {
        // 텍스트 객체를 찾을 수 없음 (로그 제거)
        if (options?.onComplete) {
          options.onComplete()
        }
        return
      }

      // 텍스트 객체를 컨테이너에 추가 (컨테이너는 이미 비워진 상태)
      if (containerRef.current) {
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

        const styleConfig: Record<string, unknown> = {
          fontFamily,
          fontSize: scene.text.fontSize || 80,
          fill: scene.text.color || '#ffffff',
          align: scene.text.style?.align || 'center',
          fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
          fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
          wordWrap: true,
          wordWrapWidth: textWidth,
          breakWords: true,
          stroke: { color: '#000000', width: 10 },
        }

        const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)
        textObj.style = textStyle

        // 밑줄 렌더링
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

        // 텍스트 Transform 적용
        if (scene.text.transform) {
          const scaleX = scene.text.transform.scaleX ?? 1
          const scaleY = scene.text.transform.scaleY ?? 1
          textObj.x = scene.text.transform.x
          textObj.y = scene.text.transform.y
          textObj.scale.set(scaleX, scaleY)
          textObj.rotation = scene.text.transform.rotation ?? 0
        } else {
          const position = scene.text.position || 'bottom'
          const stageHeight = appRef.current?.screen?.height || 1920
          if (position === 'top') {
            textObj.y = stageHeight * 0.15
          } else if (position === 'bottom') {
            textObj.y = stageHeight * 0.85
          } else {
            textObj.y = stageHeight * 0.5
          }
          textObj.x = stageWidth * 0.5
          textObj.scale.set(1, 1)
          textObj.rotation = 0
        }
      }

      // 표시
      targetTextObj.visible = true
      targetTextObj.alpha = 1

      if (options?.onComplete) {
        options.onComplete()
      }
    },
    [timeline, appRef, containerRef, textsRef]
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
      if (!timeline || !appRef.current) {
        return
      }

      // timeline.scenes가 없으면 렌더링하지 않음
      if (!timeline.scenes || timeline.scenes.length === 0) {
        return
      }

      // t에서 씬과 구간 계산
      const { sceneIndex, partIndex, offsetInPart } = calculateSceneFromTime(
        timeline,
        tSec,
        {
          ttsCacheRef,
          voiceTemplate,
          buildSceneMarkup,
          makeTtsKey,
        }
      )

      // 유효하지 않은 씬 인덱스면 렌더링하지 않음
      if (sceneIndex < 0 || sceneIndex >= timeline.scenes.length) {
        return
      }

      // 중복 렌더링 방지 (같은 t와 씬에 대해)
      const timeChanged = Math.abs(tSec - lastRenderedTRef.current) >= TIME_EPSILON
      const sceneChanged = sceneIndex !== lastRenderedSceneIndexRef.current
      
      // 중요: 이전 씬 인덱스를 업데이트 전에 저장 (씬 전환 처리에 필요)
      const previousRenderedSceneIndex = sceneChanged ? lastRenderedSceneIndexRef.current : null
      
      if (!timeChanged && !sceneChanged) {
        return
      }
      
      // 디버깅: 씬 전환 시 로그
      if (sceneChanged && process.env.NODE_ENV === 'development') {
        console.log(
          `[renderAt] 씬 전환: ${previousRenderedSceneIndex} → ${sceneIndex}, ` +
          `tSec=${tSec.toFixed(3)}, partIndex=${partIndex}, offsetInPart=${offsetInPart.toFixed(3)}`
        )
      }
      
      // 렌더링 시간과 씬 인덱스 업데이트 (씬 전환 처리 전에 업데이트)
      lastRenderedTRef.current = tSec
      lastRenderedSceneIndexRef.current = sceneIndex

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

      // 씬이 로드되었는지 확인
      const sprite = spritesRef.current.get(sceneIndex)
      const sceneText = textsRef.current.get(sceneIndex)
      const sceneLoaded = sprite !== undefined || sceneText !== undefined

      // 씬이 로드되지 않았으면 사전 로드
      if (!sceneLoaded) {
        const loadingState = sceneLoadingStates.get(sceneIndex)
        if (loadingState !== 'loading' && loadingState !== 'loaded') {
          // 비동기로 로드 시작 (await하지 않음)
          loadScene(sceneIndex).catch(() => {
            // 씬 로드 실패 (로그 제거)
          })
        }
        return
      }

      // 결정적 렌더링: 매 프레임마다 canvas를 비우고 현재 씬/구간만 새로 렌더링
      // 단, 전환 효과가 진행 중일 때는 컨테이너를 비우지 않음 (전환 효과가 묻어나오도록)
      if (!containerRef.current) {
        return
      }

      // 전환 효과가 진행 중인지 확인
      const isTransitioning = activeAnimationsRef && activeAnimationsRef.current.size > 0
      
      // 1. 컨테이너 비우기 (전환 효과가 진행 중이 아니고 씬이 변경되었을 때만)
      // 전환 효과가 진행 중일 때는 이전 씬과 현재 씬을 모두 유지하여 전환 효과가 보이도록 함
      if (!isTransitioning && previousRenderedSceneIndex !== null && previousRenderedSceneIndex !== sceneIndex && containerRef.current) {
        // 이전 씬의 스프라이트와 텍스트만 제거 (현재 씬의 것은 유지)
        const previousSprite = spritesRef.current.get(previousRenderedSceneIndex)
        const previousText = textsRef.current.get(previousRenderedSceneIndex)
        
        if (previousSprite && !previousSprite.destroyed && previousSprite.parent === containerRef.current) {
          containerRef.current.removeChild(previousSprite)
        }
        if (previousText && !previousText.destroyed && previousText.parent === containerRef.current) {
          containerRef.current.removeChild(previousText)
        }
      } else if (!isTransitioning && containerRef.current) {
        // 전환 효과가 없고 씬이 변경되지 않았으면 전체 비우기
        containerRef.current.removeChildren()
      }

      // 2. 현재 씬의 이미지 렌더링
      if (sprite && !sprite.destroyed && containerRef.current) {
        // 스프라이트가 다른 부모에 있으면 제거
        if (sprite.parent && sprite.parent !== containerRef.current) {
          sprite.parent.removeChild(sprite)
        }
        // 이미 컨테이너에 있으면 추가하지 않음 (중복 방지)
        if (!containerRef.current.children.includes(sprite)) {
          containerRef.current.addChild(sprite)
        }
        containerRef.current.setChildIndex(sprite, 0)
        sprite.visible = true
        sprite.alpha = 1
      }

      // 2-1. 현재 씬의 텍스트 객체를 컨테이너에 추가 (removeChildren 후 복원)
      if (sceneText && !sceneText.destroyed && containerRef.current) {
        // 텍스트 객체가 다른 부모에 있으면 제거
        if (sceneText.parent && sceneText.parent !== containerRef.current) {
          sceneText.parent.removeChild(sceneText)
        }
        // 컨테이너에 없으면 추가
        if (!containerRef.current.children.includes(sceneText)) {
          containerRef.current.addChild(sceneText)
        }
        // 텍스트는 항상 최상위 레이어
        const currentIndex = containerRef.current.getChildIndex(sceneText)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(sceneText, maxIndex)
        }
      }

      // 3. 현재 씬/구간의 자막 렌더링
      renderSubtitlePart(sceneIndex, partIndex, {
        skipAnimation: options?.skipAnimation,
        onComplete: () => {
          // GSAP 애니메이션 seek (해당 씬의 애니메이션이 있으면)
          if (activeAnimationsRef) {
            const animation = activeAnimationsRef.current.get(sceneIndex)
            if (animation) {
              // 구간 내 오프셋을 GSAP timeline 시간으로 변환하여 seek
              // offsetInPart는 이미 구간 내 오프셋이므로 직접 사용
              animation.seek(offsetInPart)
            }
          }
        },
      })
    },
    [
      timeline,
      appRef,
      containerRef,
      spritesRef,
      textsRef,
      currentSceneIndexRef,
      previousSceneIndexRef,
      activeAnimationsRef,
      renderSubtitlePart,
      ttsCacheRef,
      voiceTemplate,
      buildSceneMarkup,
      makeTtsKey,
      sceneLoadingStates,
      loadScene,
    ]
  )

  // Transport currentTime 변화에 자동 렌더링 (재생 중일 때만)
  // useTransportRenderer 내부에서 throttle 처리하므로 외부에서는 최소한의 호출만
  useEffect(() => {
    if (!transport || !transportState.isPlaying) {
      return
    }

    // throttle: 마지막 렌더링 이후 일정 시간이 지났을 때만 호출
    // Transport 기반 렌더링 시스템의 핵심: Transport 시간 변화에 반응하여 렌더링
    // 이는 외부 시스템(Transport)의 상태 변화에 반응하는 것이므로 effect 내에서 호출이 적절함
    // requestAnimationFrame으로 감싸서 React 렌더링 사이클과 분리하여 cascading renders 방지
    const now = Date.now()
    if (now - lastRenderTimeRef.current >= RENDER_THROTTLE_MS) {
      lastRenderTimeRef.current = now
      // requestAnimationFrame으로 비동기 실행하여 React 렌더링 사이클과 분리
      requestAnimationFrame(() => {
        renderAt(transportCurrentTime, { skipAnimation: false })
      })
    }
  }, [transport, transportCurrentTime, transportState.isPlaying, renderAt])

  return {
    renderAt,
    sceneLoadingStates,
    loadScene,
    loadAllScenes,
  }
}
