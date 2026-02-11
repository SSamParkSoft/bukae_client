'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import type { TimelineData } from '@/lib/types/domain/timeline'
import { useFabricHandlers } from '@/hooks/video/editing/useFabricHandlers'
import { useFabricSync } from '@/hooks/video/scene/management/useFabricSync'
import { applyFabricObjectDefaults, FABRIC_HANDLE_STYLE } from '@/hooks/video/pixi/fabricObjectDefaults'
import { calculateAspectFittedSize } from '../../utils/proPreviewLayout'

const FABRIC_SYNC_DEBOUNCE_MS = 80

interface UseProFabricResizeDragParams {
  enabled: boolean
  playbackContainerRef: React.RefObject<HTMLDivElement | null>
  canvasDisplaySize: { width: number; height: number } | null
  stageWidth: number
  stageHeight: number
  currentSceneIndex: number
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData | null) => void
  fallbackScript: string
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
}

interface FabricDataObject {
  dataType?: 'image' | 'text'
}

export function useProFabricResizeDrag({
  enabled,
  playbackContainerRef,
  canvasDisplaySize,
  stageWidth,
  stageHeight,
  currentSceneIndex,
  timeline,
  setTimeline,
  fallbackScript,
  spritesRef,
  textsRef,
}: UseProFabricResizeDragParams) {
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElRef = useRef<HTMLCanvasElement | null>(null)
  const scaleRatioRef = useRef(1)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncingRef = useRef(false)
  const timelineRef = useRef<TimelineData | null>(timeline)
  const currentSceneIndexRef = useRef(currentSceneIndex)
  const fallbackScriptRef = useRef(fallbackScript)
  const isSavingTransformRef = useRef(false)
  const savedSceneIndexRef = useRef<number | null>(null)
  const isManualSceneSelectRef = useRef(false)
  const [fabricReady, setFabricReady] = useState(false)

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

  useEffect(() => {
    fallbackScriptRef.current = fallbackScript
  }, [fallbackScript])

  const getDisplaySize = useCallback(() => {
    const container = playbackContainerRef.current
    if (!container) {
      return null
    }

    if (canvasDisplaySize && canvasDisplaySize.width > 0 && canvasDisplaySize.height > 0) {
      return canvasDisplaySize
    }

    const rect = container.getBoundingClientRect()
    return calculateAspectFittedSize(
      rect.width || container.clientWidth,
      rect.height || container.clientHeight,
      stageWidth / stageHeight
    )
  }, [canvasDisplaySize, playbackContainerRef, stageHeight, stageWidth])

  const updateFabricSize = useCallback(() => {
    const canvas = fabricCanvasRef.current
    const canvasEl = fabricCanvasElRef.current
    const container = playbackContainerRef.current
    if (!canvas || !canvasEl || !container) {
      return
    }

    const size = getDisplaySize()
    if (!size) {
      return
    }

    const ratio = size.width / stageWidth
    scaleRatioRef.current = ratio > 0 ? ratio : 1

    canvas.setDimensions({ width: size.width, height: size.height })

    // Fabric.js가 wrapper를 생성하므로 wrapper의 위치만 설정
    // canvasEl은 wrapper 내부에 있으므로 위치 설정 불필요
    if (canvas.wrapperEl) {
      const wrapper = canvas.wrapperEl
      wrapper.style.position = 'absolute'
      wrapper.style.left = '50%'
      wrapper.style.top = '50%'
      wrapper.style.transform = 'translate(-50%, -50%)'
      wrapper.style.width = `${size.width}px`
      wrapper.style.height = `${size.height}px`
      wrapper.style.zIndex = '40'
      wrapper.style.pointerEvents = enabled ? 'auto' : 'none'
    }

    if (canvas.upperCanvasEl) {
      // upper-canvas는 wrapper 내부에 있으므로 wrapper의 위치를 따라감
      // wrapper 내부에서 left: 0, top: 0으로 설정하여 wrapper와 정렬
      canvas.upperCanvasEl.style.position = 'absolute'
      canvas.upperCanvasEl.style.left = '0'
      canvas.upperCanvasEl.style.top = '0'
      canvas.upperCanvasEl.style.pointerEvents = enabled ? 'auto' : 'none'
      canvas.upperCanvasEl.style.zIndex = '41'
      canvas.upperCanvasEl.style.touchAction = 'none'
    }

    if (canvas.lowerCanvasEl) {
      // lower-canvas도 wrapper 내부에 있으므로 명시적으로 위치 설정
      canvas.lowerCanvasEl.style.position = 'absolute'
      canvas.lowerCanvasEl.style.left = '0'
      canvas.lowerCanvasEl.style.top = '0'
      canvas.lowerCanvasEl.style.zIndex = '40'
      canvas.lowerCanvasEl.style.backgroundColor = 'transparent'
    }

    // Fabric.js의 내부 오프셋 계산 (마우스 이벤트 좌표 변환에 필요)
    // wrapper 위치 변경 후 오프셋을 다시 계산해야 함
    requestAnimationFrame(() => {
      if (canvas && !canvas.disposed) {
        canvas.calcOffset()
        canvas.requestRenderAll()
      }
    })
  }, [enabled, getDisplaySize, playbackContainerRef, stageWidth])

  const setTimelineNonNull = useCallback((nextTimeline: TimelineData) => {
    timelineRef.current = nextTimeline
    setTimeline(nextTimeline)
  }, [setTimeline])

  useFabricHandlers({
    fabricReady,
    fabricCanvasRef,
    timeline: timeline as TimelineData | null,
    setTimeline: setTimelineNonNull,
    currentSceneIndexRef,
    fabricScaleRatioRef: scaleRatioRef,
    isSavingTransformRef,
    savedSceneIndexRef,
    isManualSceneSelectRef,
    useFabricEditing: enabled,
    fabricCanvasElementRef: fabricCanvasElRef,
    editMode: 'image',
  })

  // 공용 useFabricHandlers는 timeline 갱신만 담당하므로 Pro 미리보기(Pixi) 객체는 별도로 즉시 동기화한다.
  useEffect(() => {
    if (!timeline || currentSceneIndex < 0) {
      return
    }

    const scene = timeline.scenes[currentSceneIndex]
    if (!scene) {
      return
    }

    const sprite = spritesRef.current.get(currentSceneIndex)
    if (sprite && !sprite.destroyed && scene.imageTransform) {
      sprite.x = scene.imageTransform.x
      sprite.y = scene.imageTransform.y
      sprite.width = scene.imageTransform.width
      sprite.height = scene.imageTransform.height
      sprite.rotation = scene.imageTransform.rotation
    }

    const pixiText = textsRef.current.get(currentSceneIndex)
    if (pixiText && !pixiText.destroyed && scene.text?.transform) {
      pixiText.x = scene.text.transform.x
      pixiText.y = scene.text.transform.y
      pixiText.rotation = scene.text.transform.rotation

      if (pixiText.style) {
        pixiText.style.fontSize = scene.text.fontSize ?? pixiText.style.fontSize ?? 80
        if (scene.text.transform.width > 0) {
          pixiText.style.wordWrapWidth = scene.text.transform.width
        }
      }
    }
  }, [currentSceneIndex, timeline, spritesRef, textsRef])

  const resolveSceneImageObject = useCallback(({
    scene,
    sceneIndex,
    scale,
  }: {
    scene: TimelineData['scenes'][number]
    sceneIndex: number
    scale: number
  }) => {
    const sprite = spritesRef.current.get(sceneIndex)
    const imageTransform = scene.imageTransform ?? (
      sprite && !sprite.destroyed
        ? {
            x: sprite.x,
            y: sprite.y,
            width: sprite.width,
            height: sprite.height,
            rotation: sprite.rotation ?? 0,
          }
        : null
    )

    if (!imageTransform) {
      return null
    }

    const imageHandleObj = new fabric.Rect({
      originX: 'center',
      originY: 'center',
      left: imageTransform.x * scale,
      top: imageTransform.y * scale,
      width: Math.max(1, imageTransform.width * scale),
      height: Math.max(1, imageTransform.height * scale),
      angle: (imageTransform.rotation * 180) / Math.PI,
      fill: 'rgba(0,0,0,0.001)',
      hasBorders: true,
      hasControls: true,
      hoverCursor: 'move',
    })

    ;(imageHandleObj as fabric.Rect & FabricDataObject).dataType = 'image'
    return imageHandleObj
  }, [spritesRef])

  const resolveSceneTextContent = useCallback(() => {
    return fallbackScriptRef.current
  }, [])

  const { syncFabricWithScene } = useFabricSync({
    useFabricEditing: enabled,
    fabricCanvasRef,
    fabricScaleRatioRef: scaleRatioRef,
    currentSceneIndexRef,
    timeline,
    stageDimensions: {
      width: stageWidth,
      height: stageHeight,
    },
    resolveSceneImageObject,
    resolveSceneTextContent,
  })

  const syncFromScene = useCallback(async () => {
    const fabricCanvas = fabricCanvasRef.current
    if (!enabled || !fabricCanvas) {
      return
    }

    const activeBeforeSync = fabricCanvas.getActiveObject() as (fabric.Object & FabricDataObject) | null
    const activeTypeBeforeSync = activeBeforeSync?.dataType ?? null

    isSyncingRef.current = true
    try {
      await syncFabricWithScene()

      const objects = fabricCanvas.getObjects() as Array<fabric.Object & FabricDataObject>
      objects.forEach((obj) => {
        if (obj.dataType === 'image') {
          obj.set({
            hasBorders: true,
            hasControls: true,
            hoverCursor: 'move',
            ...FABRIC_HANDLE_STYLE,
          })
        }
        if (obj.dataType === 'text') {
          obj.set({
            hasBorders: true,
            hasControls: true,
            hoverCursor: 'move',
            ...FABRIC_HANDLE_STYLE,
          })
        }
      })

      if (activeTypeBeforeSync) {
        const sameTypeObject = objects.find((obj) => obj.dataType === activeTypeBeforeSync) ?? null
        if (sameTypeObject) {
          fabricCanvas.setActiveObject(sameTypeObject)
        } else {
          fabricCanvas.discardActiveObject()
        }
      } else {
        fabricCanvas.discardActiveObject()
      }

      fabricCanvas.requestRenderAll()
    } finally {
      isSyncingRef.current = false
    }
  }, [enabled, syncFabricWithScene])

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }

    syncTimerRef.current = setTimeout(() => {
      syncTimerRef.current = null
      void syncFromScene()
    }, FABRIC_SYNC_DEBOUNCE_MS)
  }, [syncFromScene])

  useEffect(() => {
    if (!enabled || !playbackContainerRef.current) {
      return
    }

    const container = playbackContainerRef.current

    const canvasEl = document.createElement('canvas')
    canvasEl.width = stageWidth
    canvasEl.height = stageHeight
    canvasEl.style.backgroundColor = 'transparent'
    // Fabric.js가 wrapper를 생성하므로 canvasEl의 위치는 설정하지 않음
    // wrapper 위치는 updateFabricSize()에서 설정됨

    container.appendChild(canvasEl)
    fabricCanvasElRef.current = canvasEl

    const canvas = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
    })
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.moveCursor = 'move'
    canvas.skipTargetFind = false
    applyFabricObjectDefaults()

    fabricCanvasRef.current = canvas
    setFabricReady(true)

    // Fabric.js가 wrapper를 생성한 후 위치 설정
    updateFabricSize()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateFabricSize()
        scheduleSync()
      })
    })
    resizeObserver.observe(container)

    scheduleSync()

    return () => {
      resizeObserver.disconnect()
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current)
        syncTimerRef.current = null
      }

      canvas.dispose()
      fabricCanvasRef.current = null
      fabricCanvasElRef.current = null
      setFabricReady(false)

      if (container.contains(canvasEl)) {
        container.removeChild(canvasEl)
      }
    }
  }, [
    enabled,
    playbackContainerRef,
    scheduleSync,
    stageHeight,
    stageWidth,
    updateFabricSize,
  ])

  useEffect(() => {
    if (!enabled || !fabricCanvasRef.current) {
      return
    }

    updateFabricSize()
    scheduleSync()
  }, [enabled, currentSceneIndex, canvasDisplaySize, timeline, scheduleSync, updateFabricSize])

  return {
    syncFromScene: scheduleSync,
    fabricCanvasRef,
  }
}
