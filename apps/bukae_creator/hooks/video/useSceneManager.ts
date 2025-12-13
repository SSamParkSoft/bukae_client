import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi'

interface UseSceneManagerParams {
  // Refs
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  fabricCanvasRef: React.RefObject<fabric.Canvas | null>
  fabricScaleRatioRef: React.MutableRefObject<number>
  isSavingTransformRef: React.MutableRefObject<boolean>
  
  // State/Props
  timeline: TimelineData | null
  stageDimensions: { width: number; height: number }
  useFabricEditing: boolean
  
  // Functions
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  applyAdvancedEffects: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void
  applyEnterEffect: (
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    applyAdvancedEffectsFn: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void,
    forceTransition?: string, // 강제로 적용할 전환 효과 (timeline 값 무시)
    onComplete?: () => void, // Timeline 완료 콜백
    previousIndex?: number | null // 이전 씬 인덱스
  ) => void
  onLoadComplete?: (sceneIndex: number) => void // 로드 완료 후 콜백
}

export const useSceneManager = ({
  appRef,
  containerRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  previousSceneIndexRef,
  activeAnimationsRef,
  fabricCanvasRef,
  fabricScaleRatioRef,
  isSavingTransformRef,
  timeline,
  stageDimensions,
  useFabricEditing,
  loadPixiTextureWithCache,
  applyAdvancedEffects,
  applyEnterEffect,
  onLoadComplete,
}: UseSceneManagerParams) => {
  // 현재 씬 업데이트
  // previousIndex 파라미터: 명시적으로 이전 씬 인덱스를 전달받음 (optional, 없으면 previousSceneIndexRef 사용)
  // forceTransition: 강제로 적용할 전환 효과 (timeline 값 무시, 전환 효과 미리보기용)
  const updateCurrentScene = useCallback((skipAnimation: boolean = false, explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void) => {
    const sceneIndex = currentSceneIndexRef.current
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:65',message:'updateCurrentScene 시작',data:{sceneIndex,skipAnimation,explicitPreviousIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      if (!containerRef.current || !timeline || !appRef.current) {
        return
      }

    const currentScene = timeline.scenes[sceneIndex]
    const previousIndex = explicitPreviousIndex !== undefined ? explicitPreviousIndex : previousSceneIndexRef.current
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:74',message:'previousIndex 계산',data:{previousIndex,explicitPreviousIndex,previousSceneIndexRef:previousSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    const currentSprite = spritesRef.current.get(sceneIndex)
    const currentText = textsRef.current.get(sceneIndex)
    const previousSprite = previousIndex !== null ? spritesRef.current.get(previousIndex) : null
    const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null
    
    // 스프라이트가 없으면 경고 로그 출력
    if (!currentSprite) {
      console.warn(`[updateCurrentScene] currentSprite가 없음 - sceneIndex: ${sceneIndex}, spritesRef.size: ${spritesRef.current.size}`)
      console.warn(`[updateCurrentScene] 로드된 씬 인덱스:`, Array.from(spritesRef.current.keys()))
    }

      // 애니메이션 스킵 시 즉시 표시
      if (skipAnimation) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:82',message:'skipAnimation=true 분기',data:{sceneIndex,hasActiveAnimation:false,previousSceneIndexRef:previousSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      // 전환 효과가 진행 중이면 무시 (전환 효과를 중단하지 않음)
      // activeAnimationsRef에 있는 모든 애니메이션 확인
      // Timeline이 생성되었지만 아직 시작되지 않았을 수도 있으므로, activeAnimationsRef에 있으면 무시
      let hasActiveAnimation = false
      if (activeAnimationsRef.current.has(sceneIndex)) {
        hasActiveAnimation = true
      } else {
        activeAnimationsRef.current.forEach((anim) => {
          if (anim && !anim.paused()) {
            hasActiveAnimation = true
          }
        })
      }
      
      if (hasActiveAnimation) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:92',message:'skipAnimation=true: 전환 효과 진행 중이므로 리턴',data:{sceneIndex,hasActiveAnimation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        return // 로그 제거하여 콘솔 스팸 방지
      }
      
      // 이미 같은 씬이 표시되어 있으면 무시 (불필요한 렌더링 방지)
      // 단, previousSceneIndexRef가 아직 설정되지 않았거나 다른 씬이 표시되어 있는 경우는 처리
      if (previousSceneIndexRef.current === sceneIndex) {
        // 현재 씬이 이미 표시되어 있고, 스프라이트도 visible하고 alpha도 1이면 무시
        const currentSprite = spritesRef.current.get(sceneIndex)
        if (currentSprite && currentSprite.visible && currentSprite.alpha === 1) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:100',message:'skipAnimation=true: 이미 같은 씬이 표시되어 있으므로 리턴',data:{sceneIndex,previousSceneIndexRef:previousSceneIndexRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          return
        }
      }
      
      // 이전 씬 숨기기
      if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
        previousSprite.visible = false
        previousSprite.alpha = 0
      }
      if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
        previousText.visible = false
        previousText.alpha = 0
      }
      
      // 다른 씬들 숨기기 (previousIndex가 null일 때만 모든 다른 씬을 숨김)
      // 단, 전환 효과가 완료된 후에는 이미 표시된 씬을 유지해야 하므로 previousSceneIndexRef를 확인
      if (previousIndex === null && previousSceneIndexRef.current !== sceneIndex) {
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== sceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
      }
      
      // 현재 씬 표시
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 1
      }
      if (appRef.current) {
        appRef.current.render()
      }
      previousSceneIndexRef.current = sceneIndex
      return
    }
    
    // 현재 씬 등장 효과 적용
    if (currentSprite) {
      const transition = forceTransition || currentScene.transition || 'fade'
      const transitionDuration = currentScene.transitionDuration || 1.0
      const { width, height } = stageDimensions

      console.log(`[updateCurrentScene] 전환 효과 적용 - sceneIndex: ${sceneIndex}, transition: ${transition}, duration: ${transitionDuration}, previousIndex: ${previousIndex}`)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSceneManager.ts:139',message:'전환 효과 적용',data:{sceneIndex,transition,transitionDuration,skipAnimation:false,previousIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // 현재 씬의 이전 애니메이션만 kill (다른 씬의 애니메이션은 유지)
      const existingAnim = activeAnimationsRef.current.get(sceneIndex)
      if (existingAnim) {
        existingAnim.kill()
        activeAnimationsRef.current.delete(sceneIndex)
      }

      // ===== 전환 효과 준비 =====
      
      // 1. 현재 씬을 컨테이너에 추가 (반드시 컨테이너에 있어야 렌더링됨)
      if (!containerRef.current) {
        console.error(`[updateCurrentScene] containerRef.current가 null - sceneIndex: ${sceneIndex}`)
        return
      }
      
      if (currentSprite.parent !== containerRef.current) {
        if (currentSprite.parent) {
          currentSprite.parent.removeChild(currentSprite)
        }
        containerRef.current.addChild(currentSprite)
        console.log(`[updateCurrentScene] 스프라이트를 컨테이너에 추가 - sceneIndex: ${sceneIndex}`)
      }
      
      if (currentText && currentText.parent !== containerRef.current) {
        if (currentText.parent) {
          currentText.parent.removeChild(currentText)
        }
        containerRef.current.addChild(currentText)
        console.log(`[updateCurrentScene] 텍스트를 컨테이너에 추가 - sceneIndex: ${sceneIndex}`)
      }
      
      // 2. 모든 다른 씬들 숨기기 (검은 캔버스에서 시작하기 위해)
      // previousIndex가 null이면 이전 씬을 보여주지 않고 검은 캔버스에서 시작
      spritesRef.current.forEach((sprite, idx) => {
        if (sprite && idx !== sceneIndex) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== sceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
      
      // 검은 캔버스 상태 렌더링 (모든 씬이 숨겨진 상태)
      if (appRef.current) {
        appRef.current.render()
      }
      
      // 4. 현재 씬 visible 설정 및 alpha 초기화 (전환 효과를 위해 alpha를 0으로 설정)
      // applyEnterEffect에서 alpha: 0으로 설정하고 애니메이션을 시작하지만,
      // 이전에 alpha가 1로 설정되어 있을 수 있으므로 여기서도 명시적으로 0으로 설정
      currentSprite.visible = true
      currentSprite.alpha = 0 // 전환 효과를 위해 alpha를 0으로 초기화
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 0 // 전환 효과를 위해 alpha를 0으로 초기화
      }

      // 고급 효과 적용
      if (currentScene.advancedEffects) {
        applyAdvancedEffects(currentSprite, sceneIndex, currentScene.advancedEffects)
      }
      
      // 고급 효과 적용 후에도 스프라이트가 컨테이너에 있는지 확인
      if (!currentSprite.parent && containerRef.current) {
        console.warn(`[updateCurrentScene] 고급 효과 적용 후 스프라이트가 컨테이너에 없음 - scene: ${sceneIndex}, 강제 추가`)
        containerRef.current.addChild(currentSprite)
      }
      if (currentText && !currentText.parent && containerRef.current) {
        console.warn(`[updateCurrentScene] 고급 효과 적용 후 텍스트가 컨테이너에 없음 - scene: ${sceneIndex}, 강제 추가`)
        containerRef.current.addChild(currentText)
      }

      // 전환 효과 적용
      console.log(`[updateCurrentScene] applyEnterEffect 호출 - sceneIndex: ${sceneIndex}, sprite visible: ${currentSprite.visible}, sprite alpha: ${currentSprite.alpha}, sprite parent: ${currentSprite.parent !== null}`)
      // applyEnterEffect에서 초기 상태 설정 후 렌더링하므로 여기서는 렌더링하지 않음
      // onAnimationComplete가 전달되면 Timeline 완료 시 호출됨
      const wrappedOnComplete = onAnimationComplete ? () => {
        // 전환 효과 완료 후 이전 씬 숨기기
        if (!skipAnimation && previousIndex !== null && previousIndex !== sceneIndex) {
          const prevSprite = spritesRef.current.get(previousIndex)
          const prevText = textsRef.current.get(previousIndex)
          
          if (prevSprite) {
            prevSprite.visible = false
            prevSprite.alpha = 0
            // 컨테이너에서 제거하지 않음 (나중에 다시 사용할 수 있으므로)
            console.log(`[updateCurrentScene] 전환 효과 완료 - 이전 씬 숨김 - previousIndex: ${previousIndex}`)
          }
          
          if (prevText) {
            prevText.visible = false
            prevText.alpha = 0
          }
        }
        
        // 이전 씬이 없거나 null인 경우에도 다른 모든 씬들을 다시 한 번 확인하여 숨김
        // (혹시 모를 경우를 대비)
        spritesRef.current.forEach((sprite, idx) => {
          if (sprite && idx !== sceneIndex) {
            sprite.visible = false
            sprite.alpha = 0
          }
        })
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== sceneIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
        
        // 최종 렌더링
        if (appRef.current) {
          appRef.current.render()
        }
        
        // 원래 onAnimationComplete 콜백 호출
        onAnimationComplete(sceneIndex)
      } : (() => {
        // onAnimationComplete가 없어도 이전 씬을 숨겨야 함
        if (!skipAnimation && previousIndex !== null && previousIndex !== sceneIndex) {
          const prevSprite = spritesRef.current.get(previousIndex)
          const prevText = textsRef.current.get(previousIndex)
          
          if (prevSprite) {
            prevSprite.visible = false
            prevSprite.alpha = 0
          }
          
          if (prevText) {
            prevText.visible = false
            prevText.alpha = 0
          }
          
          // 다른 모든 씬들도 숨김
          spritesRef.current.forEach((sprite, idx) => {
            if (sprite && idx !== sceneIndex) {
              sprite.visible = false
              sprite.alpha = 0
            }
          })
          textsRef.current.forEach((text, idx) => {
            if (text && idx !== sceneIndex) {
              text.visible = false
              text.alpha = 0
            }
          })
          
          if (appRef.current) {
            appRef.current.render()
          }
        }
      })
      
      // 전환 효과 적용 전에 한 번 렌더링하여 초기 상태 확인
      if (appRef.current) {
        appRef.current.render()
      }
      
      applyEnterEffect(currentSprite, currentText || null, transition, transitionDuration, width, height, sceneIndex, applyAdvancedEffects, forceTransition, wrappedOnComplete, previousIndex)
    } else {
      console.warn(`[updateCurrentScene] currentSprite가 없음 - sceneIndex: ${sceneIndex}`)
      // 스프라이트가 없으면 즉시 표시
      spritesRef.current.forEach((sprite, index) => {
        if (sprite?.parent) {
          sprite.visible = index === sceneIndex
          sprite.alpha = index === sceneIndex ? 1 : 0
        }
      })
      textsRef.current.forEach((text, index) => {
        if (text?.parent) {
          text.visible = index === sceneIndex
          text.alpha = index === sceneIndex ? 1 : 0
        }
      })

      if (appRef.current) {
        appRef.current.render()
      }
    }

      previousSceneIndexRef.current = sceneIndex
    } catch (error) {
      console.error('updateCurrentScene error:', error)
    }
  }, [timeline, stageDimensions, applyEnterEffect, applyAdvancedEffects, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, previousSceneIndexRef, activeAnimationsRef])

  // Fabric 오브젝트를 현재 씬 상태에 맞게 동기화
  const syncFabricWithScene = useCallback(async () => {
    if (!useFabricEditing || !fabricCanvasRef.current || !timeline) return
    const fabricCanvas = fabricCanvasRef.current
    const sceneIndex = currentSceneIndexRef.current
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    const scale = fabricScaleRatioRef.current
    fabricCanvas.clear()

    const { width, height } = stageDimensions

    // 이미지 (좌표를 스케일 비율에 맞게 조정)
    if (scene.image) {
      const img = await (fabric.Image.fromURL as (url: string, options?: { crossOrigin?: string }) => Promise<fabric.Image>)(scene.image, { crossOrigin: 'anonymous' }) as fabric.Image
      if (img) {
        const transform = scene.imageTransform
        let left: number, top: number, imgScaleX: number, imgScaleY: number, angleDeg: number
        
        if (transform) {
          angleDeg = (transform.rotation || 0) * (180 / Math.PI)
          const effectiveWidth = transform.width * (transform.scaleX || 1)
          const effectiveHeight = transform.height * (transform.scaleY || 1)
          imgScaleX = (effectiveWidth / img.width) * scale
          imgScaleY = (effectiveHeight / img.height) * scale
          left = transform.x * scale
          top = transform.y * scale
        } else {
          // 초기 contain/cover 계산과 동일하게 배치
          const params = calculateSpriteParams(img.width, img.height, width, height, scene.imageFit || 'fill')
          imgScaleX = (params.width / img.width) * scale
          imgScaleY = (params.height / img.height) * scale
          left = params.x * scale
          top = params.y * scale
          angleDeg = 0
        }
        
        img.set({
          originX: 'left',
          originY: 'top',
          left,
          top,
          scaleX: imgScaleX,
          scaleY: imgScaleY,
          angle: angleDeg,
          selectable: true,
          evented: true,
        })
        ;(img as fabric.Image & { dataType?: 'image' | 'text' }).dataType = 'image'
        fabricCanvas.add(img)
      }
    }

    // 텍스트 (좌표를 스케일 비율에 맞게 조정)
    if (scene.text?.content) {
      const transform = scene.text.transform
      const angleDeg = (transform?.rotation || 0) * (180 / Math.PI)
      const baseFontSize = scene.text.fontSize || 32
      const scaledFontSize = baseFontSize * scale
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: (transform?.x ?? width / 2) * scale,
        top: (transform?.y ?? height * 0.9) * scale,
        originX: 'center',
        originY: 'center',
        fontFamily: scene.text.font || 'Arial',
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight: scene.text.style?.bold ? 'bold' : 'normal',
        fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
        underline: scene.text.style?.underline || false,
        textAlign: scene.text.style?.align || 'center',
        selectable: true,
        evented: true,
        angle: angleDeg,
      })
      if (transform) {
        // width가 있으면 박스 크기 반영
        if (transform.width) {
          textObj.set({ width: transform.width * scale })
        }
        // scaleX/scaleY는 이미 fontSize와 width에 반영됨
      }
      ;(textObj as fabric.Textbox & { dataType?: 'image' | 'text' }).dataType = 'text'
      fabricCanvas.add(textObj)
    }

    fabricCanvas.renderAll()
  }, [useFabricEditing, fabricCanvasRef, fabricScaleRatioRef, currentSceneIndexRef, timeline, stageDimensions])

  // 모든 씬 로드
  const loadAllScenes = useCallback(async () => {
    if (!appRef.current || !containerRef.current || !timeline) {
      return
    }

    const container = containerRef.current
    const { width, height } = stageDimensions

    container.removeChildren()
    spritesRef.current.clear()
    textsRef.current.clear()

    const loadScene = async (sceneIndex: number) => {
      const scene = timeline.scenes[sceneIndex]
      if (!scene || !scene.image) {
        return
      }

      try {
        const texture = await loadPixiTextureWithCache(scene.image)
        const sprite = new PIXI.Sprite(texture)
        const imageFit = scene.imageFit || 'fill'
        const params = calculateSpriteParams(
          texture.width,
          texture.height,
          width,
          height,
          imageFit
        )

        sprite.x = params.x
        sprite.y = params.y
        sprite.width = params.width
        sprite.height = params.height
        sprite.anchor.set(0, 0)
        sprite.visible = false
        sprite.alpha = 0

        // Transform 데이터 적용
        if (scene.imageTransform) {
          sprite.x = scene.imageTransform.x
          sprite.y = scene.imageTransform.y
          sprite.width = scene.imageTransform.width
          sprite.height = scene.imageTransform.height
          sprite.rotation = scene.imageTransform.rotation
        }

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)

        if (scene.text?.content) {
          const textStyle = new PIXI.TextStyle({
            fontFamily: scene.text.font || 'Arial',
            fontSize: scene.text.fontSize || 32,
            fill: scene.text.color || '#ffffff',
            align: scene.text.style?.align || 'center',
            fontWeight: scene.text.style?.bold ? 'bold' : 'normal',
            fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
            dropShadow: {
              color: '#000000',
              blur: 10,
              angle: Math.PI / 4,
              distance: 2,
            },
          })

          const text = new PIXI.Text({
            text: scene.text.content,
            style: textStyle,
          })

          text.anchor.set(0.5, 0.5)
          let textY = height / 2
          if (scene.text.position === 'top') {
            textY = 200
          } else if (scene.text.position === 'bottom') {
            textY = height - 200
          }
          text.x = width / 2
          text.y = textY
          text.visible = false
          text.alpha = 0

          // 텍스트 Transform 적용
          if (scene.text.transform) {
            const scaleX = scene.text.transform.scaleX ?? 1
            const scaleY = scene.text.transform.scaleY ?? 1
            text.x = scene.text.transform.x
            text.y = scene.text.transform.y
            text.scale.set(scaleX, scaleY)
            text.rotation = scene.text.transform.rotation
          }

          container.addChild(text)
          textsRef.current.set(sceneIndex, text)
        }
      } catch (error) {
        console.error(`Failed to load scene ${sceneIndex}:`, error)
      }
    }

    await Promise.all(timeline.scenes.map((_, index) => loadScene(index)))
    
    // 렌더링 강제 실행
    requestAnimationFrame(() => {
      const sceneIndex = currentSceneIndexRef.current
      if (isSavingTransformRef.current) {
        const currentSprite = spritesRef.current.get(sceneIndex)
        const currentText = textsRef.current.get(sceneIndex)
        if (currentSprite) {
          currentSprite.visible = true
          currentSprite.alpha = 1
        }
        if (currentText) {
          currentText.visible = true
          currentText.alpha = 1
        }
        if (appRef.current) {
          appRef.current.render()
        }
      } else {
        updateCurrentScene(true)
      }
      if (appRef.current) {
        appRef.current.render()
      }
      
      if (onLoadComplete) {
        onLoadComplete(sceneIndex)
      }
    })
  }, [timeline, stageDimensions, updateCurrentScene, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, isSavingTransformRef, loadPixiTextureWithCache, onLoadComplete])

  return {
    updateCurrentScene,
    syncFabricWithScene,
    loadAllScenes,
  }
}
