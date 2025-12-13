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
  mounted?: boolean
  setCanvasSize?: (size: { width: string; height: string }) => void
  activeAnimationsRef?: MutableRefObject<Map<number, any>> // 전환 효과 중인지 확인용
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
  mounted = true,
  setCanvasSize,
  activeAnimationsRef,
}: UsePixiFabricParams) {
  // PixiJS 초기화
  useEffect(() => {
    if (!mounted) {
      console.log('usePixiFabric: Not mounted yet')
      return
    }
    
    if (!pixiContainerRef.current) {
      console.log('usePixiFabric: pixiContainerRef.current is null, retrying...')
      // ref가 아직 설정되지 않았으면 다음 프레임에 다시 시도
      const timeoutId = setTimeout(() => {
        if (pixiContainerRef.current) {
          // 재귀적으로 다시 시도하기 위해 의존성 배열이 변경되도록 함
          // 하지만 이 방법은 무한 루프를 만들 수 있으므로, 대신 mounted 상태를 확인
        }
      }, 100)
      return () => clearTimeout(timeoutId)
    }

    const container = pixiContainerRef.current
    const { width, height } = stageDimensions
    console.log('usePixiFabric: Initializing PixiJS', { width, height, containerExists: !!container })

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
        console.log('usePixiFabric: PixiJS init success', { app: !!app, canvas: !!app?.canvas, container: !!container })
        
        appRef.current = app

        const mainContainer = new PIXI.Container()
        app.stage.addChild(mainContainer)
        containerRef.current = mainContainer

        // Canvas 스타일 설정 - container 크기에 맞춰 조정 (다음 프레임에 실행하여 container 크기가 확정된 후)
        requestAnimationFrame(() => {
          // app과 canvas가 여전히 유효한지 확인 (안전하게 체크)
          if (!app) {
            console.error('usePixiFabric: app is null after init')
            return
          }
          
          if (!app.canvas) {
            console.error('usePixiFabric: app.canvas is null after init, app may be destroyed')
            return
          }
          
          // appRef가 여전히 같은 app을 가리키는지 확인
          if (appRef.current !== app) {
            console.log('usePixiFabric: appRef changed, skipping canvas setup')
            return
          }
          
          const containerRect = container.getBoundingClientRect()
          const containerWidth = containerRect.width || container.clientWidth
          const containerHeight = containerRect.height || container.clientHeight
          const targetRatio = 9 / 16
          
          console.log('usePixiFabric: Container dimensions', { containerWidth, containerHeight })
          
          let displayWidth: number
          let displayHeight: number
          if (containerWidth > 0 && containerHeight > 0) {
            if (containerWidth / containerHeight > targetRatio) {
              // container가 더 넓으면 높이에 맞춤
              displayHeight = containerHeight
              displayWidth = containerHeight * targetRatio
            } else {
              // container가 더 좁으면 너비에 맞춤
              displayWidth = containerWidth
              displayHeight = containerWidth / targetRatio
            }
          } else {
            // container 크기가 아직 결정되지 않았으면 기본값 사용
            displayWidth = width
            displayHeight = height
          }
          
          // canvas가 여전히 유효한지 다시 확인
          if (!app || !app.canvas) {
            console.error('usePixiFabric: canvas is null before style setup', { app: !!app, canvas: app?.canvas })
            return
          }
          
          app.canvas.style.width = `${displayWidth}px`
          app.canvas.style.height = `${displayHeight}px`
          app.canvas.style.maxWidth = '100%'
          app.canvas.style.maxHeight = '100%'
          app.canvas.style.display = 'block'
          app.canvas.style.objectFit = 'contain'
          app.canvas.style.position = 'absolute'
          app.canvas.style.top = '50%'
          app.canvas.style.left = '50%'
          app.canvas.style.transform = 'translate(-50%, -50%)'
          container.appendChild(app.canvas)
          
          console.log('usePixiFabric: Canvas appended to container', { 
            canvasInContainer: app && app.canvas ? container.contains(app.canvas) : false,
            canvasWidth: app?.canvas?.width,
            canvasHeight: app?.canvas?.height,
            displayWidth,
            displayHeight,
            containerWidth: container.clientWidth,
            containerHeight: container.clientHeight,
          })
          
          // 초기 렌더링 강제
          app.render()
          
          // Ticker가 자동으로 실행되도록 확인 (재생 중 전환 효과를 위해)
          // autoStart: true로 설정되어 있지만, 명시적으로 확인
          if (!app.ticker.started) {
            console.log('usePixiFabric: Starting PixiJS ticker')
            app.ticker.start()
          }
          
          // Ticker에 기본 렌더링 콜백 추가
          // 전환 효과 중일 때는 GSAP ticker가 렌더링하므로 PixiJS ticker는 건너뜀
          app.ticker.add(() => {
            // activeAnimationsRef가 있고 활성 애니메이션이 있으면 확인
            if (activeAnimationsRef && activeAnimationsRef.current.size > 0) {
              // Timeline이 실제로 활성화되어 있는지 확인
              // paused가 false이면 Timeline이 시작된 상태이므로 GSAP ticker가 렌더링
              let hasActiveAnimation = false
              activeAnimationsRef.current.forEach((tl) => {
                // paused가 false이면 Timeline이 시작된 상태 (isActive가 false여도)
                if (tl && !tl.paused()) {
                  hasActiveAnimation = true
                }
              })
              // Timeline이 시작된 상태이면 렌더링 건너뛰기 (GSAP ticker가 처리)
              if (hasActiveAnimation) {
                return
              }
            }
            // 전환 효과가 없거나 Timeline이 아직 시작되지 않았을 때는 PixiJS ticker가 렌더링
            app.render()
          })
          console.log('usePixiFabric: Added default render callback to ticker (skips only when GSAP animations are active)')
          
          // Canvas 크기 상태 업데이트
          if (setCanvasSize) {
            setCanvasSize({ width: `${displayWidth}px`, height: `${displayHeight}px` })
          }
          
          // pixiReady 설정
          console.log('usePixiFabric: Setting pixiReady to true, ticker started:', app.ticker.started)
          setPixiReady(true)
        })
      })
      .catch((error) => {
        console.error('usePixiFabric: PixiJS init failed', error)
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
  }, [mounted, stageDimensions, setPixiReady, setFabricReady])

  // Fabric.js 초기화 (편집 오버레이)
  useEffect(() => {
    if (!mounted) {
      return
    }
    
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
    mounted,
    useFabricEditing,
    stageDimensions,
    fabricScaleRatioRef,
    editMode,
    setFabricReady,
  ])
}

