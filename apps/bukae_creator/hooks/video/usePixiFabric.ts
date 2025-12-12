'use client'

import { useEffect } from 'react'
import type { MutableRefObject } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'

interface UsePixiFabricParams {
  pixiContainerRef: MutableRefObject<HTMLDivElement | null>
  appRef: MutableRefObject<PIXI.Application | null>
  containerRef: MutableRefObject<PIXI.Container | null>
  fabricCanvasRef: MutableRefObject<fabric.Canvas | null>
  fabricCanvasElementRef: MutableRefObject<HTMLCanvasElement | null>
  setPixiReady: (value: boolean) => void
  setFabricReady: (value: boolean) => void
  useFabricEditing: boolean
  stageDimensions: { width: number; height: number }
  fabricScaleRatioRef: MutableRefObject<number>
  editMode?: string
}

export function usePixiFabric({
  pixiContainerRef,
  appRef,
  containerRef,
  fabricCanvasRef,
  fabricCanvasElementRef,
  setPixiReady,
  setFabricReady,
  useFabricEditing,
  stageDimensions,
  fabricScaleRatioRef,
  editMode,
}: UsePixiFabricParams) {
  // PixiJS 초기화
  useEffect(() => {
    if (!pixiContainerRef.current) {
      return
    }

    const container = pixiContainerRef.current
    const { width, height } = stageDimensions

    if (appRef.current) {
      const existingCanvas = container.querySelector('canvas')
      if (existingCanvas) container.removeChild(existingCanvas)
      appRef.current.destroy(true, { children: true, texture: true })
      appRef.current = null
      containerRef.current = null
    }

    const app = new PIXI.Application()

    app
      .init({
        width,
        height,
        backgroundColor: 0x000000,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        autoStart: true,
      })
      .then(() => {
        app.canvas.style.width = '100%'
        app.canvas.style.height = '100%'
        app.canvas.style.maxWidth = '100%'
        app.canvas.style.maxHeight = '100%'
        app.canvas.style.display = 'block'
        app.canvas.style.objectFit = 'contain'
        container.appendChild(app.canvas)
        appRef.current = app

        const mainContainer = new PIXI.Container()
        app.stage.addChild(mainContainer)
        containerRef.current = mainContainer

        requestAnimationFrame(() => {
          setPixiReady(true)
        })
      })
      .catch(() => {
        console.error('PixiJS init failed')
      })

    const containerEl = pixiContainerRef.current

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true })
        appRef.current = null
        containerRef.current = null
      }
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
      if (fabricCanvasElementRef.current && containerEl?.contains(fabricCanvasElementRef.current)) {
        containerEl.removeChild(fabricCanvasElementRef.current)
      }
      setFabricReady(false)
      setPixiReady(false)
    }
  }, [pixiContainerRef, appRef, containerRef, fabricCanvasRef, fabricCanvasElementRef, setPixiReady, setFabricReady, stageDimensions])

  // Fabric.js 초기화 (편집 오버레이)
  useEffect(() => {
    if (!pixiContainerRef.current || !useFabricEditing || !appRef.current || !containerRef.current) {
      return
    }
    const container = pixiContainerRef.current
    container.style.position = 'relative'
    container.style.pointerEvents = 'auto'

    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dispose()
      fabricCanvasRef.current = null
    }
    if (fabricCanvasElementRef.current && container.contains(fabricCanvasElementRef.current)) {
      container.removeChild(fabricCanvasElementRef.current)
    }

    const canvasEl = document.createElement('canvas')
    canvasEl.width = stageDimensions.width
    canvasEl.height = stageDimensions.height
    canvasEl.style.position = 'absolute'
    canvasEl.style.inset = '0'
    canvasEl.style.width = '100%'
    canvasEl.style.height = '100%'
    canvasEl.style.pointerEvents = useFabricEditing ? 'auto' : 'none'
    canvasEl.style.zIndex = '5'
    fabricCanvasElementRef.current = canvasEl
    container.appendChild(canvasEl)

    const fabricCanvas = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
    })
    fabricCanvas.defaultCursor = 'default'
    fabricCanvas.hoverCursor = 'move'
    fabricCanvas.moveCursor = 'move'
    fabricCanvas.skipTargetFind = false

    // 핸들 스타일 (원형/보라색)
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#8b5cf6',
      cornerStrokeColor: '#ffffff',
      cornerSize: 12,
      cornerStyle: 'circle',
      borderColor: '#8b5cf6',
      borderScaleFactor: 2,
      padding: 8,
    })
    if (fabric.Object.prototype.controls?.mtr) {
      fabric.Object.prototype.controls.mtr.offsetY = -30
    }

    // upper/lower/wrapper 레이어 z-index 및 포인터 설정
    if (fabricCanvas.upperCanvasEl) {
      fabricCanvas.upperCanvasEl.style.position = 'absolute'
      fabricCanvas.upperCanvasEl.style.inset = '0'
      fabricCanvas.upperCanvasEl.style.width = '100%'
      fabricCanvas.upperCanvasEl.style.height = '100%'
      fabricCanvas.upperCanvasEl.style.pointerEvents = useFabricEditing ? 'auto' : 'none'
      fabricCanvas.upperCanvasEl.style.zIndex = '6'
    }
    if (fabricCanvas.lowerCanvasEl) {
      fabricCanvas.lowerCanvasEl.style.position = 'absolute'
      fabricCanvas.lowerCanvasEl.style.inset = '0'
      fabricCanvas.lowerCanvasEl.style.width = '100%'
      fabricCanvas.lowerCanvasEl.style.height = '100%'
      fabricCanvas.lowerCanvasEl.style.zIndex = '5'
    }
    if (fabricCanvas.wrapperEl) {
      const wrapper = fabricCanvas.wrapperEl
      wrapper.style.position = 'absolute'
      wrapper.style.inset = '0'
      wrapper.style.width = '100%'
      wrapper.style.height = '100%'
      wrapper.style.zIndex = '5'
    }

    fabricCanvasRef.current = fabricCanvas

    // 9:16 비율 유지 및 중앙 정렬
    setTimeout(() => {
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight
      const targetRatio = 9 / 16

      let displayWidth: number
      let displayHeight: number
      if (containerWidth / containerHeight > targetRatio) {
        displayHeight = containerHeight
        displayWidth = containerHeight * targetRatio
      } else {
        displayWidth = containerWidth
        displayHeight = containerWidth / targetRatio
      }

      const scaleRatio = displayWidth / stageDimensions.width
      fabricScaleRatioRef.current = scaleRatio

      fabricCanvasRef.current?.setDimensions({ width: displayWidth, height: displayHeight })

      if (fabricCanvasRef.current?.wrapperEl) {
        const wrapper = fabricCanvasRef.current.wrapperEl
        wrapper.style.position = 'absolute'
        wrapper.style.left = '50%'
        wrapper.style.top = '50%'
        wrapper.style.transform = 'translate(-50%, -50%)'
        wrapper.style.width = `${displayWidth}px`
        wrapper.style.height = `${displayHeight}px`
      }

      fabricCanvasRef.current?.calcOffset()
      fabricCanvasRef.current?.requestRenderAll()
    }, 0)

    requestAnimationFrame(() => setFabricReady(true))

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose()
        fabricCanvasRef.current = null
      }
      if (fabricCanvasElementRef.current && container.contains(fabricCanvasElementRef.current)) {
        container.removeChild(fabricCanvasElementRef.current)
      }
      setFabricReady(false)
    }
  }, [
    pixiContainerRef,
    useFabricEditing,
    appRef,
    containerRef,
    fabricCanvasRef,
    fabricCanvasElementRef,
    setFabricReady,
    stageDimensions,
    fabricScaleRatioRef,
    editMode,
  ])
}

