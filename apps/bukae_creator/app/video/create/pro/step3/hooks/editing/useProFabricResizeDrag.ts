'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import type { TimelineData } from '@/lib/types/domain/timeline'
import { useFabricHandlers } from '@/hooks/video/editing/useFabricHandlers'
import { applyFabricObjectDefaults, FABRIC_HANDLE_STYLE } from '@/hooks/video/pixi/fabricObjectDefaults'
import { calculateSpriteParams } from '@/utils/pixi/sprite'
import { calculateAspectFittedSize } from '../../utils/proPreviewLayout'
import { useProSubtitleTextBounds } from './useProSubtitleTextBounds'

const INVISIBLE_HIT_FILL = 'rgba(0,0,0,0)'

function getFastImageHandleStyle(scaleRatio: number) {
  void scaleRatio
  return {
    ...FABRIC_HANDLE_STYLE,
    cornerSize: 7,
    touchCornerSize: 7,
    padding: 4,
  }
}

function getFastTextHandleStyle(scaleRatio: number) {
  void scaleRatio
  return {
    ...FABRIC_HANDLE_STYLE,
    cornerSize: 7,
    touchCornerSize: 7,
    padding: 4,
  }
}

const FAST_LOCKED_TRANSFORM_STYLE = {
  lockScalingX: false,
  lockScalingY: false,
  lockRotation: true,
  lockScalingFlip: true,
}

const TEXT_LOCKED_SCALE_STYLE = {
  lockScalingX: false,
  lockScalingY: false,
  lockRotation: true,
  lockScalingFlip: true,
}

interface UseProFabricResizeDragParams {
  enabled: boolean
  playbackContainerRef: React.RefObject<HTMLDivElement | null>
  canvasDisplaySize: { width: number; height: number } | null
  stageWidth: number
  stageHeight: number
  currentSceneIndex: number
  timeline: TimelineData | null
  setTimeline: (timeline: TimelineData | null) => void
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
  editMode?: 'none' | 'image' | 'text'
}

interface FabricDataObject {
  dataType?: 'image' | 'text'
}

function applyFastLikeControlPolicy(target: fabric.Object) {
  if (typeof (target as { setControlsVisibility?: (options: Record<string, boolean>) => void }).setControlsVisibility === 'function') {
    ;(target as { setControlsVisibility: (options: Record<string, boolean>) => void }).setControlsVisibility({
      mtr: false,
      tl: true,
      tr: true,
      bl: true,
      br: true,
    })
  }
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
  spritesRef,
  textsRef,
  videoElementsRef: _videoElementsRef,
  editMode = 'image',
}: UseProFabricResizeDragParams) {
  void _videoElementsRef
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null)
  const fabricCanvasElRef = useRef<HTMLCanvasElement | null>(null)
  const scaleRatioRef = useRef(1)
  const syncRafRef = useRef<number | null>(null)
  const timelineCommitRafRef = useRef<number | null>(null)
  const pendingTimelineRef = useRef<TimelineData | null>(null)
  const timelineRef = useRef<TimelineData | null>(timeline)
  const setTimelineRef = useRef(setTimeline)
  const currentSceneIndexRef = useRef(currentSceneIndex)
  const isSavingTransformRef = useRef(false)
  const savedSceneIndexRef = useRef<number | null>(null)
  const isManualSceneSelectRef = useRef(false)
  const [fabricReady, setFabricReady] = useState(false)
  const { getSubtitleTextBounds } = useProSubtitleTextBounds({ textsRef })

  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  useEffect(() => {
    setTimelineRef.current = setTimeline
  }, [setTimeline])

  useEffect(() => {
    currentSceneIndexRef.current = currentSceneIndex
  }, [currentSceneIndex])

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
  }, [canvasDisplaySize, playbackContainerRef, stageWidth, stageHeight])

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

    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.setDimensions({ width: size.width, height: size.height })
    }

    if (canvas.wrapperEl) {
      const wrapper = canvas.wrapperEl
      wrapper.style.position = 'absolute'
      wrapper.style.left = '50%'
      wrapper.style.top = '50%'
      wrapper.style.transform = 'translate(-50%, -50%)'
      wrapper.style.width = `${size.width}px`
      wrapper.style.height = `${size.height}px`
      wrapper.style.zIndex = '40'
    }

    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.position = 'absolute'
      canvas.upperCanvasEl.style.left = '0'
      canvas.upperCanvasEl.style.top = '0'
      canvas.upperCanvasEl.style.zIndex = '41'
      canvas.upperCanvasEl.style.touchAction = 'none'
    }

    if (canvas.lowerCanvasEl) {
      canvas.lowerCanvasEl.style.position = 'absolute'
      canvas.lowerCanvasEl.style.left = '0'
      canvas.lowerCanvasEl.style.top = '0'
      canvas.lowerCanvasEl.style.zIndex = '40'
      canvas.lowerCanvasEl.style.backgroundColor = 'transparent'
    }

    requestAnimationFrame(() => {
      if (!canvas || canvas.disposed) {
        return
      }
      canvas.calcOffset()
      const objects = canvas.getObjects() as Array<fabric.Object & FabricDataObject>
      objects.forEach((obj) => {
        if (obj.dataType === 'image') {
          obj.set(getFastImageHandleStyle(ratio))
        } else if (obj.dataType === 'text') {
          obj.set(getFastTextHandleStyle(ratio))
        }
      })
      canvas.requestRenderAll()
    })
  }, [getDisplaySize, playbackContainerRef, stageWidth])

  const setTimelineNonNull = useCallback((nextTimeline: TimelineData) => {
    timelineRef.current = nextTimeline
    pendingTimelineRef.current = nextTimeline
    if (timelineCommitRafRef.current !== null) {
      return
    }
    timelineCommitRafRef.current = requestAnimationFrame(() => {
      timelineCommitRafRef.current = null
      const latest = pendingTimelineRef.current
      pendingTimelineRef.current = null
      if (!latest) {
        return
      }
      timelineRef.current = latest
      setTimeline(latest)
    })
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
    editMode,
    disableContinuousTextScaleCorrection: true,
    persistTimelineDuringTransform: false,
  })

  // Timeline 변경을 Pixi 객체에 즉시 반영
  useEffect(() => {
    if (!timeline || currentSceneIndex < 0) {
      return
    }

    const scene = timeline.scenes[currentSceneIndex]
    if (!scene) {
      return
    }

    const sprite = spritesRef.current.get(currentSceneIndex)
    if (sprite && !sprite.destroyed) {
      if (scene.imageTransform) {
        sprite.x = scene.imageTransform.x
        sprite.y = scene.imageTransform.y
        sprite.width = scene.imageTransform.width
        sprite.height = scene.imageTransform.height
        sprite.rotation = scene.imageTransform.rotation
      } else {
        const textureWidth = sprite.texture?.width || stageWidth
        const textureHeight = sprite.texture?.height || stageHeight
        const fitted = calculateSpriteParams(
          textureWidth,
          textureHeight,
          stageWidth,
          stageHeight,
          scene.imageFit ?? 'contain'
        )
        sprite.x = fitted.x + fitted.width / 2
        sprite.y = fitted.y + fitted.height / 2
        sprite.width = fitted.width
        sprite.height = fitted.height
        sprite.rotation = 0
      }
    }

    const pixiText = textsRef.current.get(currentSceneIndex)
    if (pixiText && !pixiText.destroyed && scene.text?.transform) {
      pixiText.x = scene.text.transform.x
      pixiText.y = scene.text.transform.y
      pixiText.rotation = scene.text.transform.rotation

      if (pixiText.style) {
        pixiText.style.fontSize = scene.text.fontSize ?? pixiText.style.fontSize ?? 80
        const wrapWidth = normalizeNumber(scene.text.transform.width, 0)
        if (wrapWidth > 0) {
          pixiText.style.wordWrapWidth = wrapWidth
        }
      }
    }
  }, [currentSceneIndex, timeline, spritesRef, textsRef, stageHeight, stageWidth])

  const buildFabricScene = useCallback(() => {
    const fabricCanvas = fabricCanvasRef.current
    if (!fabricCanvas) {
      return
    }

    const ratio = scaleRatioRef.current > 0 ? scaleRatioRef.current : 1
    const sceneIndex = currentSceneIndexRef.current
    const scene = timelineRef.current?.scenes?.[sceneIndex]

    fabricCanvas.clear()

    const sprite = spritesRef.current.get(sceneIndex)
    const imageTransform =
      scene?.imageTransform
        ? {
            x: scene.imageTransform.x,
            y: scene.imageTransform.y,
            width: scene.imageTransform.width,
            height: scene.imageTransform.height,
            rotation: scene.imageTransform.rotation ?? 0,
          }
        : sprite && !sprite.destroyed
          ? {
              x: sprite.x,
              y: sprite.y,
              width: sprite.width,
              height: sprite.height,
              rotation: sprite.rotation ?? 0,
            }
          : {
              x: stageWidth / 2,
              y: stageHeight / 2,
              width: stageWidth,
              height: stageHeight,
              rotation: 0,
            }

    const imageProxy = new fabric.Rect({
      originX: 'center',
      originY: 'center',
      left: imageTransform.x * ratio,
      top: imageTransform.y * ratio,
      width: Math.max(1, imageTransform.width * ratio),
      height: Math.max(1, imageTransform.height * ratio),
      angle: (imageTransform.rotation * 180) / Math.PI,
      fill: INVISIBLE_HIT_FILL,
      stroke: INVISIBLE_HIT_FILL,
      strokeWidth: 1,
      selectable: true,
      evented: true,
      activeOn: 'down',
      opacity: 1,
      hasBorders: false,
      hasControls: true,
      hoverCursor: 'move',
      centeredScaling: true,
      centeredRotation: true,
      ...FAST_LOCKED_TRANSFORM_STYLE,
      ...getFastImageHandleStyle(ratio),
    })
    applyFastLikeControlPolicy(imageProxy)
    imageProxy.setCoords()
    ;(imageProxy as fabric.Rect & FabricDataObject).dataType = 'image'
    fabricCanvas.add(imageProxy)

    const pixiText = textsRef.current.get(sceneIndex)
    const timelineText = scene?.text
    const textContentFromPixi = typeof pixiText?.text === 'string' ? pixiText.text : ''
    const textContent = (timelineText?.content ?? textContentFromPixi).trim()
    const measuredTextBounds = getSubtitleTextBounds(sceneIndex)
    const measuredTextWidth = normalizeNumber(measuredTextBounds?.width, 0)
    const measuredTextHeight = normalizeNumber(measuredTextBounds?.height, 0)
    const fallbackTextWidth = Math.max(10, normalizeNumber(timelineText?.transform?.width, stageWidth * 0.25))
    const fallbackTextHeight = Math.max(10, Math.max(24, normalizeNumber(timelineText?.fontSize, 80) * 1.2))
    const exactTextWidth = measuredTextWidth > 0 ? measuredTextWidth : fallbackTextWidth
    const exactTextHeight = measuredTextHeight > 0 ? measuredTextHeight : fallbackTextHeight
    const textCenterX = normalizeNumber(
      pixiText?.x,
      normalizeNumber(timelineText?.transform?.x, stageWidth / 2)
    )
    const textCenterY = normalizeNumber(
      pixiText?.y,
      normalizeNumber(timelineText?.transform?.y, stageHeight * 0.885)
    )
    const textRotation = normalizeNumber(
      pixiText?.rotation,
      normalizeNumber(timelineText?.transform?.rotation, 0)
    )

    if (textContent.length > 0 || measuredTextBounds) {
      const fontSize = normalizeNumber(
        timelineText?.fontSize,
        normalizeNumber((pixiText?.style as { fontSize?: number } | undefined)?.fontSize, 80)
      )

      const textProxy = new fabric.Textbox(textContent || ' ', {
        originX: 'center',
        originY: 'center',
        left: textCenterX * ratio,
        top: textCenterY * ratio,
        width: Math.max(10, exactTextWidth * ratio),
        height: Math.max(10, exactTextHeight * ratio),
        angle: (textRotation * 180) / Math.PI,
        fontSize: Math.max(8, fontSize * ratio),
        fill: INVISIBLE_HIT_FILL,
        stroke: INVISIBLE_HIT_FILL,
        strokeWidth: 1,
        backgroundColor: INVISIBLE_HIT_FILL,
        selectable: true,
        evented: true,
        activeOn: 'down',
        opacity: 1,
        hasBorders: false,
        hasControls: true,
        hoverCursor: 'move',
        editable: false,
        ...TEXT_LOCKED_SCALE_STYLE,
        ...getFastTextHandleStyle(ratio),
      })
      applyFastLikeControlPolicy(textProxy)
      textProxy.setCoords()
      ;(textProxy as fabric.Textbox & FabricDataObject).dataType = 'text'
      fabricCanvas.add(textProxy)
    }

    if (editMode === 'image' || editMode === 'text') {
      const objects = fabricCanvas.getObjects() as Array<fabric.Object & FabricDataObject>
      const target = objects.find((obj) => obj.dataType === editMode) ?? null
      if (target) {
        fabricCanvas.setActiveObject(target)
      }
    }

    fabricCanvas.requestRenderAll()
  }, [editMode, stageWidth, stageHeight, spritesRef, textsRef, getSubtitleTextBounds])

  const syncFromScene = useCallback(async () => {
    if (!enabled || !fabricCanvasRef.current) {
      return
    }
    buildFabricScene()
  }, [enabled, buildFabricScene])

  const scheduleSync = useCallback(() => {
    if (syncRafRef.current !== null) {
      cancelAnimationFrame(syncRafRef.current)
      syncRafRef.current = null
    }

    syncRafRef.current = requestAnimationFrame(() => {
      syncRafRef.current = null
      void syncFromScene()
    })
  }, [syncFromScene])

  const updateFabricSizeRef = useRef(updateFabricSize)
  const scheduleSyncRef = useRef(scheduleSync)
  useEffect(() => {
    updateFabricSizeRef.current = updateFabricSize
  }, [updateFabricSize])
  useEffect(() => {
    scheduleSyncRef.current = scheduleSync
  }, [scheduleSync])

  useEffect(() => {
    if (!enabled || !playbackContainerRef.current) {
      return
    }

    const container = playbackContainerRef.current

    if (fabricCanvasRef.current) {
      return
    }

    const canvasEl = document.createElement('canvas')
    canvasEl.width = stageWidth
    canvasEl.height = stageHeight
    canvasEl.style.backgroundColor = 'transparent'

    container.appendChild(canvasEl)
    fabricCanvasElRef.current = canvasEl

    const canvas = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: 'transparent',
    })
    canvas.controlsAboveOverlay = true
    canvas.defaultCursor = 'default'
    canvas.hoverCursor = 'move'
    canvas.moveCursor = 'move'
    canvas.skipTargetFind = false
    applyFabricObjectDefaults()

    fabricCanvasRef.current = canvas

    requestAnimationFrame(() => {
      setFabricReady(true)
    })

    updateFabricSizeRef.current()
    scheduleSyncRef.current()

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateFabricSizeRef.current()
        scheduleSyncRef.current()
      })
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      if (syncRafRef.current !== null) {
        cancelAnimationFrame(syncRafRef.current)
        syncRafRef.current = null
      }
      if (timelineCommitRafRef.current !== null) {
        cancelAnimationFrame(timelineCommitRafRef.current)
        timelineCommitRafRef.current = null
      }
      const pendingTimeline = pendingTimelineRef.current
      pendingTimelineRef.current = null
      if (pendingTimeline) {
        setTimelineRef.current(pendingTimeline)
      }

      canvas.dispose()
      fabricCanvasRef.current = null
      fabricCanvasElRef.current = null
      setFabricReady(false)

      if (container.contains(canvasEl)) {
        container.removeChild(canvasEl)
      }
    }
  }, [enabled, playbackContainerRef, stageHeight, stageWidth])

  useEffect(() => {
    if (!enabled || !fabricCanvasRef.current) {
      return
    }

    updateFabricSize()
    scheduleSync()
  }, [enabled, currentSceneIndex, canvasDisplaySize, editMode, scheduleSync, updateFabricSize])

  useEffect(() => {
    if (!enabled || !fabricCanvasRef.current) {
      return
    }

    const fabricCanvas = fabricCanvasRef.current
    const applyTargetToPixi = (target: fabric.Object | null | undefined) => {
      if (!target || (target as fabric.Object & { destroyed?: boolean }).destroyed) {
        return
      }

      const typedTarget = target as fabric.Object & FabricDataObject
      const scale = scaleRatioRef.current || 1
      const invScale = 1 / scale
      const sceneIndex = currentSceneIndexRef.current

      if (typedTarget.dataType === 'image') {
        const sprite = spritesRef.current.get(sceneIndex)
        if (!sprite || sprite.destroyed) {
          return
        }

        const scaledWidth = typeof target.getScaledWidth === 'function'
          ? target.getScaledWidth()
          : (target.width || 0) * (target.scaleX || 1)
        const scaledHeight = typeof target.getScaledHeight === 'function'
          ? target.getScaledHeight()
          : (target.height || 0) * (target.scaleY || 1)

        sprite.x = (target.left ?? 0) * invScale
        sprite.y = (target.top ?? 0) * invScale
        sprite.width = scaledWidth * invScale
        sprite.height = scaledHeight * invScale
        sprite.rotation = ((target.angle || 0) * Math.PI) / 180
        return
      }

      if (typedTarget.dataType === 'text') {
        const pixiText = textsRef.current.get(sceneIndex)
        if (!pixiText || pixiText.destroyed) {
          return
        }

        const scaledWidth = typeof target.getScaledWidth === 'function'
          ? target.getScaledWidth()
          : (target.width || 0) * (target.scaleX || 1)

        pixiText.x = (target.left ?? 0) * invScale
        pixiText.y = (target.top ?? 0) * invScale
        pixiText.rotation = ((target.angle || 0) * Math.PI) / 180
        if (pixiText.style && scaledWidth > 0) {
          pixiText.style.wordWrapWidth = scaledWidth * invScale
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMoving = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScaling = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRotating = (e: any) => {
      applyTargetToPixi(e?.target as fabric.Object | null | undefined)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:moving', handleMoving as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:scaling', handleScaling as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('object:rotating', handleRotating as any)

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:moving', handleMoving as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:scaling', handleScaling as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fabricCanvas.off('object:rotating', handleRotating as any)
    }
  }, [enabled, spritesRef, textsRef])

  return {
    syncFromScene: scheduleSync,
    syncFromSceneDirect: syncFromScene,
    fabricCanvasRef,
    fabricReady,
  }
}
