'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import type { TimelineData } from '@/lib/types/domain/timeline'
import { useFabricHandlers } from '@/hooks/video/editing/useFabricHandlers'
import { useFabricSync } from '@/hooks/video/scene/management/useFabricSync'
import { applyFabricObjectDefaults } from '@/hooks/video/pixi/fabricObjectDefaults'
import { calculateAspectFittedSize } from '../../utils/proPreviewLayout'

const FABRIC_SYNC_DEBOUNCE_MS = 80
// Fast 트랙 usePixiEditor와 동일: 브랜드 teal #5e8790, 흰색 테두리
const FAST_HANDLER_BORDER_COLOR = '#5e8790'
// Fast와 동일한 논리 크기 (Pixi 월드). Pro는 캔버스가 디스플레이 크기라 scaleRatio로 보정해 화면에서 동일하게 보이게 함.
const FAST_IMAGE_HANDLE_SIZE = 20
const FAST_TEXT_HANDLE_SIZE = 16
const MIN_HANDLE_SIZE = 6

function getFastImageHandleStyle(scaleRatio: number) {
  const cornerSize = Math.max(MIN_HANDLE_SIZE, Math.round(FAST_IMAGE_HANDLE_SIZE * scaleRatio))
  return {
    transparentCorners: false,
    cornerColor: '#5e8790',
    cornerStrokeColor: '#ffffff',
    cornerSize,
    cornerStyle: 'rect' as const,
    borderColor: FAST_HANDLER_BORDER_COLOR,
    borderScaleFactor: 2,
    padding: 0,
  }
}

function getFastTextHandleStyle(scaleRatio: number) {
  const cornerSize = Math.max(MIN_HANDLE_SIZE, Math.round(FAST_TEXT_HANDLE_SIZE * scaleRatio))
  return {
    transparentCorners: false,
    cornerColor: '#5e8790',
    cornerStrokeColor: '#ffffff',
    cornerSize,
    cornerStyle: 'rect' as const,
    borderColor: FAST_HANDLER_BORDER_COLOR,
    borderScaleFactor: 2,
    padding: 0,
  }
}
const FAST_LOCKED_TRANSFORM_STYLE = {
  // lockScalingX/Y를 false로 설정하여 코너 핸들러 드래그 가능하게 함
  // 하지만 실제 스케일 변경은 이벤트 핸들러에서 무시됨
  lockScalingX: false,
  lockScalingY: false,
  lockRotation: true,
  lockScalingFlip: true,
}

// 텍스트 전용: 스케일은 허용하되 이벤트 핸들러에서 즉시 리셋
const TEXT_LOCKED_SCALE_STYLE = {
  lockScalingX: false,  // 리사이즈 핸들이 작동하도록 허용
  lockScalingY: false,  // 하지만 object:scaling 이벤트에서 즉시 리셋
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
  fallbackScript: string
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  videoElementsRef: React.MutableRefObject<Map<number, HTMLVideoElement>>
}

interface FabricDataObject {
  dataType?: 'image' | 'text'
}

function applyFastLikeControlPolicy(target: fabric.Object) {
  if (typeof (target as { setControlsVisibility?: (options: Record<string, boolean>) => void }).setControlsVisibility === 'function') {
    ;(target as { setControlsVisibility: (options: Record<string, boolean>) => void }).setControlsVisibility({
      mtr: false, // Fast와 동일하게 회전 핸들 미사용
      // 대각선 핸들러(코너 핸들러)는 활성화하되, 스케일은 lockScalingX/Y로 막혀있음
      tl: true, // top-left
      tr: true, // top-right
      bl: true, // bottom-left
      br: true, // bottom-right
    })
  }
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
  videoElementsRef,
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
    // wrapper 위치 변경 후 오프셋을 다시 계산해야 함. 리사이즈 시 핸들 크기도 위에서 구한 ratio로 갱신.
    requestAnimationFrame(() => {
      if (canvas && !canvas.disposed) {
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

  const resolveSceneImageObject = useCallback(async ({
    scene,
    sceneIndex,
    scale,
    stageDimensions,
  }: {
    scene: TimelineData['scenes'][number]
    sceneIndex: number
    scale: number
    stageDimensions: { width: number; height: number }
  }): Promise<fabric.Image | null> => {
    void stageDimensions

    // imageTransform이 있으면 그것을 우선 사용 (사용자가 편집한 결과)
    // 없으면 스프라이트의 현재 위치를 사용 (초기 상태)
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

    // 비디오 요소에서 프레임 캡처
    const video = videoElementsRef.current.get(sceneIndex)
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null
    }

    // 비디오가 프레임 데이터를 가지고 있는지 확인 (readyState >= 2)
    // readyState가 2 미만이면 프레임을 캡처할 수 없음
    if (video.readyState < 2) {
      // 비디오가 아직 준비되지 않았으면 null 반환
      // 호출하는 쪽에서 비디오가 준비될 때까지 기다린 후 다시 시도해야 함
      return null
    }

    // 비디오 프레임을 캔버스에 그려서 이미지로 변환
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return null
    }

    // 비디오 프레임을 캔버스에 그리기
    // seek 완료 후 프레임이 업데이트되었는지 확인하기 위해
    // 비디오가 정지 상태이고 현재 시간이 설정되어 있는지 확인
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    } catch (error) {
      // 프레임 캡처 실패 시 null 반환
      console.warn('[resolveSceneImageObject] 비디오 프레임 캡처 실패:', error)
      return null
    }
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)

    // fabric.Image 생성
    const fabricImage = await fabric.Image.fromURL(imageDataUrl, {
      crossOrigin: 'anonymous',
    })

    // imageTransform을 기준으로 위치와 크기 설정
    fabricImage.set({
      originX: 'center',
      originY: 'center',
      left: imageTransform.x * scale,
      top: imageTransform.y * scale,
      scaleX: (imageTransform.width * scale) / fabricImage.width!,
      scaleY: (imageTransform.height * scale) / fabricImage.height!,
      angle: (imageTransform.rotation * 180) / Math.PI,
      selectable: true,
      evented: true,
      hasBorders: false, // Fast처럼 박스 테두리 없이 코너 핸들만
      hasControls: true,
      hoverCursor: 'move',
      centeredScaling: true,
      centeredRotation: true,
      ...FAST_LOCKED_TRANSFORM_STYLE,
      ...getFastImageHandleStyle(scale),
    })
    applyFastLikeControlPolicy(fabricImage)

    ;(fabricImage as fabric.Image & FabricDataObject).dataType = 'image'
    return fabricImage
  }, [spritesRef, videoElementsRef])

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

      const ratio = scaleRatioRef.current
      const objects = fabricCanvas.getObjects() as Array<fabric.Object & FabricDataObject>
      objects.forEach((obj) => {
        if (obj.dataType === 'image') {
          obj.set({
            selectable: true,
            evented: true,
            hasBorders: false, // Fast처럼 박스 테두리 없이 코너 핸들만
            hasControls: true,
            hoverCursor: 'move',
            centeredScaling: true,
            centeredRotation: true,
            ...FAST_LOCKED_TRANSFORM_STYLE,
            ...getFastImageHandleStyle(ratio),
          })
          applyFastLikeControlPolicy(obj)
        }
        if (obj.dataType === 'text') {
          obj.set({
            selectable: true,
            evented: true,
            hasBorders: false, // Fast처럼 박스 테두리 없이 코너 핸들만
            hasControls: true,
            hoverCursor: 'move',
            ...TEXT_LOCKED_SCALE_STYLE,  // 텍스트는 스케일을 완전히 막음
            ...getFastTextHandleStyle(ratio),
          })
          applyFastLikeControlPolicy(obj)
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
    
    // fabricCanvasRef.current가 설정된 후에 fabricReady를 true로 설정
    // requestAnimationFrame을 사용하여 다음 프레임에 실행되도록 함
    requestAnimationFrame(() => {
      setFabricReady(true)
    })

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
    syncFromSceneDirect: syncFromScene, // debounce 없이 직접 동기화하는 함수
    fabricCanvasRef,
    fabricReady,
  }
}
