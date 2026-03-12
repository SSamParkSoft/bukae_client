'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { useProFabricResizeDrag } from './useProFabricResizeDrag'
import { useProEditModeManager } from './useProEditModeManager'
import { getAppCanvas, STAGE_WIDTH, STAGE_HEIGHT } from '../usePixiApp'
import type { TimelineData } from '@/lib/types/domain/timeline'

interface UseProFabricEditLayerParams {
  appRef: React.MutableRefObject<PIXI.Application | null>
  subtitleContainerRef: React.MutableRefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  playbackContainerRef: React.RefObject<HTMLDivElement | null>
  canvasDisplaySize: { width: number; height: number } | null
  currentSceneIndex: number
  currentSceneIndexRef: React.MutableRefObject<number>
  isPlaying: boolean
  pixiReady: boolean
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData | null) => void
  currentSceneVideoUrl: string | undefined
  setupSpriteClickEventRef: React.MutableRefObject<(sceneIndex: number, sprite: PIXI.Sprite) => boolean>
}

export function useProFabricEditLayer({
  appRef,
  subtitleContainerRef,
  spritesRef,
  textsRef,
  videoElementsRef,
  playbackContainerRef,
  canvasDisplaySize,
  currentSceneIndex,
  currentSceneIndexRef,
  isPlaying,
  pixiReady,
  timeline,
  setTimeline,
  currentSceneVideoUrl,
  setupSpriteClickEventRef,
}: UseProFabricEditLayerParams) {
  const [editMode, setEditMode] = useState<'none' | 'image' | 'text'>('none')
  const prevSceneIndexRef = useRef(currentSceneIndex)
  const prevFabricSceneIndexRef = useRef(currentSceneIndex)

  // 씬 변경 시 editMode 초기화
  useEffect(() => {
    const prevSceneIndex = prevSceneIndexRef.current
    if (prevSceneIndex !== currentSceneIndex && !isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
    prevSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex, isPlaying, editMode])

  const useFabricEditing = editMode === 'image' || editMode === 'text'

  const {
    syncFromScene: syncFabricScene,
    syncFromSceneDirect,
    fabricCanvasRef: proFabricCanvasRef,
    fabricReady,
  } = useProFabricResizeDrag({
    videoElementsRef,
    enabled: pixiReady && !isPlaying,
    playbackContainerRef,
    canvasDisplaySize,
    stageWidth: STAGE_WIDTH,
    stageHeight: STAGE_HEIGHT,
    currentSceneIndex,
    timeline,
    setTimeline,
    spritesRef,
    textsRef,
    editMode,
  })

  useEffect(() => {
    if (isPlaying && editMode !== 'none') {
      setEditMode('none')
    }
  }, [isPlaying, editMode])

  useEffect(() => {
    const prevSceneIndex = prevFabricSceneIndexRef.current
    if (prevSceneIndex === currentSceneIndex) {
      return
    }
    prevFabricSceneIndexRef.current = currentSceneIndex
    const fabricCanvas = proFabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }, [currentSceneIndex, proFabricCanvasRef])

  useProEditModeManager({
    appRef,
    fabricCanvasRef: proFabricCanvasRef,
    subtitleContainerRef,
    useFabricEditing,
    pixiReady,
    fabricReady,
    isPlaying,
  })

  const activateFabricObjectByType = useCallback(
    (dataType: 'image' | 'text') => {
      let attempts = 0
      const MAX_ATTEMPTS = 120

      const activate = () => {
        const fabricCanvas = proFabricCanvasRef.current
        if (!fabricCanvas) {
          if (attempts < MAX_ATTEMPTS) {
            attempts += 1
            requestAnimationFrame(activate)
          }
          return
        }

        const objects = fabricCanvas.getObjects() as Array<fabric.Object & { dataType?: 'image' | 'text' }>
        const target = objects.find((obj) => obj.dataType === dataType)
        if (!target) {
          if (attempts < MAX_ATTEMPTS) {
            attempts += 1
            requestAnimationFrame(activate)
          }
          return
        }

        target.set({
          hasControls: true,
          hasBorders: false,
          selectable: true,
          evented: true,
        })
        target.setCoords()
        fabricCanvas.setActiveObject(target)
        fabricCanvas.renderAll()
      }

      requestAnimationFrame(activate)
    },
    [proFabricCanvasRef]
  )

  useEffect(() => {
    if (!fabricReady || isPlaying || editMode === 'none') {
      return
    }
    activateFabricObjectByType(editMode)
  }, [fabricReady, isPlaying, editMode, activateFabricObjectByType])

  useEffect(() => {
    if (editMode !== 'none') {
      return
    }
    const fabricCanvas = proFabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }
    fabricCanvas.discardActiveObject()
    fabricCanvas.requestRenderAll()
  }, [editMode, proFabricCanvasRef])

  const enterEditMode = useCallback(
    (mode: 'image' | 'text') => {
      setEditMode(mode)
      if (syncFromSceneDirect) {
        void syncFromSceneDirect().then(() => {
          activateFabricObjectByType(mode)
        })
        return
      }
      activateFabricObjectByType(mode)
    },
    [setEditMode, syncFromSceneDirect, activateFabricObjectByType]
  )

  // ===== 스프라이트 클릭 이벤트 설정 =====
  const setupSpriteClickEvent = useCallback(
    (sceneIndex: number, sprite: PIXI.Sprite) => {
      if (isPlaying || !pixiReady) {
        return false
      }

      if (!sprite || sprite.destroyed || !sprite.visible) {
        return false
      }

      sprite.interactive = true
      ;(sprite as PIXI.Sprite & { eventMode?: string }).eventMode = 'static'
      sprite.cursor = 'pointer'
      sprite.off('pointerdown')
      sprite.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        enterEditMode('image')
      })

      return true
    },
    [isPlaying, pixiReady, enterEditMode]
  )

  useEffect(() => {
    setupSpriteClickEventRef.current = setupSpriteClickEvent
    return () => {
      setupSpriteClickEventRef.current = () => false
    }
  }, [setupSpriteClickEvent, setupSpriteClickEventRef])

  // ===== 텍스트 클릭 이벤트 설정 =====
  const setupTextClickEvent = useCallback(
    (sceneIndex: number, textObj: PIXI.Text) => {
      if (isPlaying || !pixiReady) {
        return false
      }

      if (!textObj || textObj.destroyed || !textObj.visible) {
        return false
      }

      textObj.interactive = true
      ;(textObj as PIXI.Text & { eventMode?: string }).eventMode = 'static'
      textObj.cursor = 'pointer'
      textObj.off('pointerdown')
      textObj.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
        e.stopPropagation()
        enterEditMode('text')
      })

      return true
    },
    [isPlaying, pixiReady, enterEditMode]
  )

  // ===== ESC 키 처리 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editMode !== 'none') {
        setEditMode('none')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [editMode])

  // ===== 재생 중 클릭 이벤트 제거 =====
  useEffect(() => {
    if (isPlaying) {
      spritesRef.current.forEach((sprite) => {
        if (sprite && !sprite.destroyed) {
          sprite.interactive = false
          ;(sprite as PIXI.Sprite & { eventMode?: string }).eventMode = 'none'
          sprite.cursor = 'default'
          sprite.off('pointerdown')
        }
      })
      textsRef.current.forEach((textObj) => {
        if (textObj && !textObj.destroyed) {
          textObj.interactive = false
          ;(textObj as PIXI.Text & { eventMode?: string }).eventMode = 'none'
          textObj.cursor = 'default'
          textObj.off('pointerdown')
        }
      })
    }
  }, [isPlaying, spritesRef, textsRef])

  // Pixi 이벤트 누락 대비: 캔버스 기준 수동 hit-test로 편집 모드 진입 보장
  useEffect(() => {
    if (!pixiReady || isPlaying || !appRef.current) {
      return
    }
    if (editMode !== 'none') {
      return
    }

    const app = appRef.current
    const appCanvas = getAppCanvas(app)
    if (!appCanvas || !app.screen) {
      return
    }

    type HitTestTarget = {
      destroyed?: boolean
      visible?: boolean
      alpha?: number
      getBounds?: () => { x: number; y: number; width: number; height: number }
    }

    const isPointInsideObject = (displayObject: HitTestTarget | null | undefined, x: number, y: number) => {
      if (!displayObject || displayObject.destroyed) {
        return false
      }
      if (!displayObject.visible || displayObject.alpha === 0) {
        return false
      }
      try {
        const bounds = displayObject.getBounds?.()
        if (!bounds) {
          return false
        }
        return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height
      } catch {
        return false
      }
    }

    const handleCanvasMouseDown = (event: MouseEvent) => {
      const rect = appCanvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0 || !app.screen) {
        return
      }

      const scaleX = app.screen.width / rect.width
      const scaleY = app.screen.height / rect.height
      const x = (event.clientX - rect.left) * scaleX
      const y = (event.clientY - rect.top) * scaleY
      const sceneIndex = currentSceneIndexRef.current

      const textObj = textsRef.current.get(sceneIndex)
      if (isPointInsideObject(textObj, x, y)) {
        enterEditMode('text')
        return
      }

      const sprite = spritesRef.current.get(sceneIndex)
      if (isPointInsideObject(sprite, x, y)) {
        enterEditMode('image')
      }
    }

    appCanvas.addEventListener('mousedown', handleCanvasMouseDown, true)
    return () => {
      appCanvas.removeEventListener('mousedown', handleCanvasMouseDown, true)
    }
  }, [pixiReady, isPlaying, editMode, appRef, currentSceneIndexRef, textsRef, spritesRef, enterEditMode])

  // ===== Fabric 캔버스 이벤트 처리 =====
  useEffect(() => {
    const fabricCanvas = proFabricCanvasRef?.current
    if (!fabricCanvas || isPlaying || !pixiReady) {
      return
    }

    const resolveTargetType = (target: fabric.Object | null | undefined): 'image' | 'text' | null => {
      const typedTarget = target as fabric.Object & { dataType?: 'image' | 'text' }
      if (!typedTarget?.dataType) {
        return null
      }
      return typedTarget.dataType
    }

    const handleMouseDown = (e: fabric.TPointerEventInfo) => {
      const selectedType = resolveTargetType(e.target as fabric.Object | null)
      if (!selectedType) {
        const activeObject = fabricCanvas.getActiveObject() as (fabric.Object & { dataType?: 'image' | 'text' }) | null
        if (activeObject?.dataType) {
          return
        }
        setEditMode((prev) => (prev === 'none' ? prev : 'none'))
        fabricCanvas.discardActiveObject()
        fabricCanvas.requestRenderAll()
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionCreated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSelectionUpdated = (e: any) => {
      const selected = (e.selected as fabric.Object[] | undefined)?.[0]
      const selectedType = resolveTargetType(selected)
      if (!selectedType) {
        return
      }
      setEditMode((prev) => (prev === selectedType ? prev : selectedType))
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:down', handleMouseDown as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:created', handleSelectionCreated as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('selection:updated', handleSelectionUpdated as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('mouse:down', handleMouseDown as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:created', handleSelectionCreated as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('selection:updated', handleSelectionUpdated as any)
    }
  }, [proFabricCanvasRef, isPlaying, pixiReady])

  // ===== 스프라이트/텍스트 클릭 이벤트 자동 설정 =====
  useEffect(() => {
    if (isPlaying || !pixiReady) {
      return
    }

    let retryCount = 0
    const MAX_RETRIES = 20
    let frameId: number | null = null

    const checkAndSetup = () => {
      const sprite = spritesRef.current.get(currentSceneIndex)
      if (sprite && !sprite.destroyed && sprite.visible) {
        if (!sprite.interactive || sprite.cursor !== 'pointer') {
          setupSpriteClickEvent(currentSceneIndex, sprite)
        }
      } else if (retryCount < MAX_RETRIES) {
        retryCount++
        frameId = requestAnimationFrame(checkAndSetup)
      }
    }

    frameId = requestAnimationFrame(checkAndSetup)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isPlaying, pixiReady, currentSceneIndex, setupSpriteClickEvent, spritesRef])

  useEffect(() => {
    if (isPlaying || !pixiReady) {
      return
    }

    let retryCount = 0
    const MAX_RETRIES = 20
    let frameId: number | null = null

    const checkAndSetup = () => {
      const textObj = textsRef.current.get(currentSceneIndex)
      if (textObj && !textObj.destroyed && textObj.visible) {
        if (!textObj.interactive || textObj.cursor !== 'pointer') {
          setupTextClickEvent(currentSceneIndex, textObj)
        }
      } else if (retryCount < MAX_RETRIES) {
        retryCount++
        frameId = requestAnimationFrame(checkAndSetup)
      }
    }

    frameId = requestAnimationFrame(checkAndSetup)

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isPlaying, pixiReady, currentSceneIndex, setupTextClickEvent, textsRef])

  // ===== Fabric 씬 동기화 (editMode 진입 시) =====
  useEffect(() => {
    if (!pixiReady || isPlaying || currentSceneIndex < 0 || !syncFromSceneDirect) {
      return
    }
    if (!fabricReady || editMode === 'none') {
      return
    }

    const fabricEditingEnabled = proFabricCanvasRef?.current !== null
    if (!fabricEditingEnabled) {
      return
    }

    let cancelled = false
    let retryCount = 0
    const MAX_RETRIES = 180
    const syncNow = () => {
      if (!cancelled) {
        void syncFromSceneDirect().then(() => {
          if (!cancelled) {
            activateFabricObjectByType(editMode)
          }
        })
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(syncNow)
    })

    const runSyncWhenVideoReady = () => {
      if (cancelled) {
        return
      }

      if (!currentSceneVideoUrl) {
        return
      }

      const currentVideo = videoElementsRef.current.get(currentSceneIndex)
      if (currentVideo && currentVideo.readyState >= 2 && currentVideo.videoWidth > 0 && currentVideo.videoHeight > 0) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            syncNow()
          })
        })
        return
      }

      if (retryCount >= MAX_RETRIES) {
        return
      }

      retryCount += 1
      requestAnimationFrame(runSyncWhenVideoReady)
    }

    runSyncWhenVideoReady()

    return () => {
      cancelled = true
    }
  }, [
    currentSceneIndex,
    currentSceneVideoUrl,
    isPlaying,
    pixiReady,
    syncFromSceneDirect,
    proFabricCanvasRef,
    fabricReady,
    editMode,
    activateFabricObjectByType,
    videoElementsRef,
  ])

  // ===== Fabric 씬 동기화 (timeline 변경 시) =====
  const timelineScenesKey = useMemo(() => {
    if (!timeline?.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes
      .map(
        (scene, idx) =>
          `${idx}-${scene.imageFit || 'contain'}-${scene.imageTransform ? JSON.stringify(scene.imageTransform) : 'none'}-${scene.text?.content || ''}`
      )
      .join('|')
  }, [timeline])

  useEffect(() => {
    if (!fabricReady || !timeline || timeline.scenes.length === 0) {
      return
    }
    if (!pixiReady || isPlaying || currentSceneIndex < 0) {
      return
    }
    if (editMode !== 'none') {
      return
    }

    syncFabricScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, timelineScenesKey, currentSceneIndex, isPlaying, pixiReady, editMode, syncFabricScene])

  return {
    editMode,
    setEditMode,
    enterEditMode,
    proFabricCanvasRef,
    fabricReady,
    syncFabricScene,
    syncFromSceneDirect,
  }
}
