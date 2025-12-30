import { useCallback, useRef } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'

// "움직임" 효과 목록 (그룹 내 전환 효과 지속 대상)
const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']

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
    previousIndex?: number | null, // 이전 씬 인덱스
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>, // 그룹별 Timeline 추적
    sceneId?: number // 현재 씬의 sceneId
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
  // 그룹별 전환 효과 애니메이션 Timeline 추적 (sceneId를 키로 사용)
  const groupTransitionTimelinesRef = useRef<Map<number, gsap.core.Timeline>>(new Map())

  // 현재 씬 업데이트
  // previousIndex 파라미터: 명시적으로 이전 씬 인덱스를 전달받음 (optional, 없으면 previousSceneIndexRef 사용)
  // forceTransition: 강제로 적용할 전환 효과 (timeline 값 무시, 전환 효과 미리보기용)
  const updateCurrentScene = useCallback((skipAnimation: boolean = false, explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void) => {
    const sceneIndex = currentSceneIndexRef.current
    try {
      if (!containerRef.current || !timeline || !appRef.current) {
        return
      }

    const currentScene = timeline.scenes[sceneIndex]
    const previousIndex = explicitPreviousIndex !== undefined ? explicitPreviousIndex : previousSceneIndexRef.current
    const currentSprite = spritesRef.current.get(sceneIndex)
    const currentText = textsRef.current.get(sceneIndex)
    const previousSprite = previousIndex !== null ? spritesRef.current.get(previousIndex) : null
    const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null
    
    // 스프라이트가 없으면 경고 로그 출력
    if (!currentSprite) {
    }

      // 애니메이션 스킵 시 즉시 표시
      if (skipAnimation) {
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
        return // 로그 제거하여 콘솔 스팸 방지
      }
      
      // 이미 같은 씬이 표시되어 있으면 무시 (불필요한 렌더링 방지)
      // 단, previousSceneIndexRef가 아직 설정되지 않았거나 다른 씬이 표시되어 있는 경우는 처리
      if (previousSceneIndexRef.current === sceneIndex) {
        // 현재 씬이 이미 표시되어 있고, 스프라이트도 visible하고 alpha도 1이면 무시
        const currentSprite = spritesRef.current.get(sceneIndex)
        if (currentSprite && currentSprite.visible && currentSprite.alpha === 1) {
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
    
    // 전환 효과 적용을 위한 wrappedOnComplete 미리 정의
    // 같은 그룹 내 씬 전환 시에도 호출할 수 있도록 상위 스코프에서 정의
    const wrappedOnComplete = onAnimationComplete ? () => {
      // 전환 효과 완료 후 이전 씬 숨기기
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
      }
      
      // 이전 씬이 없거나 null인 경우에도 다른 모든 씬들을 다시 한 번 확인하여 숨김
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
    
    // 현재 씬 등장 효과 적용
    if (currentSprite) {
      // 그룹의 첫 번째 씬 찾기 (같은 sceneId를 가진 씬들 중 첫 번째)
      const firstSceneIndex = currentScene.sceneId !== undefined 
        ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
        : -1
      const firstSceneSprite = firstSceneIndex >= 0 ? spritesRef.current.get(firstSceneIndex) : null
      const isFirstSceneInGroup = firstSceneIndex === sceneIndex
      
      // 같은 그룹 내 씬인지 확인 (이전 씬이 같은 그룹인 경우)
      const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null
      const isInSameGroup = firstSceneIndex >= 0 && 
                            currentScene.sceneId !== undefined && 
                            previousIndex !== null &&
                            previousScene !== null &&
                            previousScene.sceneId === currentScene.sceneId
      
      // 같은 그룹 내 씬들은 항상 첫 번째 씬의 스프라이트 사용
      // 같은 그룹 내 씬인 경우 (이전 씬이 같은 그룹이거나 첫 번째 씬인 경우)
      let spriteToUse = currentSprite
      if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
        // 같은 그룹 내 씬인 경우 항상 첫 번째 씬의 스프라이트 사용
        const firstSprite = spritesRef.current.get(firstSceneIndex)
        if (firstSprite) {
          spriteToUse = firstSprite
        }
      }
      
      // transition 결정
      // 같은 그룹 내 씬들은 첫 번째 씬의 transition과 transitionDuration을 공유
      // 각 씬은 자신의 duration만큼만 전환 효과 사용
      let transition: string
      let transitionDuration: number
      
      if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
        // 같은 그룹 내 씬: 첫 번째 씬의 transition과 transitionDuration 사용
        const firstSceneInGroup = timeline.scenes[firstSceneIndex]
        transition = forceTransition || firstSceneInGroup?.transition || 'fade'
        
        // 각 씬은 자신의 duration만큼만 전환 효과 사용
        transitionDuration = currentScene.duration && currentScene.duration > 0
          ? currentScene.duration
          : 0.5
      } else {
        // 다른 그룹으로 넘어가는 경우
        transition = forceTransition || currentScene.transition || 'fade'
        transitionDuration = currentScene.transitionDuration && currentScene.transitionDuration > 0
          ? currentScene.transitionDuration
          : 0.5
      }
      
      const { width, height } = stageDimensions
      
      // transition이 'none'이면 애니메이션 없이 즉시 표시
      if (transition === 'none') {
        // 이전 씬 숨기기
        if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
          previousSprite.visible = false
          previousSprite.alpha = 0
        }
        if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
          previousText.visible = false
          previousText.alpha = 0
        }
        
        // 현재 씬 표시
        if (currentSprite.parent !== containerRef.current) {
          if (currentSprite.parent) {
            currentSprite.parent.removeChild(currentSprite)
          }
          containerRef.current.addChild(currentSprite)
        }
        currentSprite.visible = true
        currentSprite.alpha = 1
        
        if (currentText) {
          if (currentText.parent !== containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
          currentText.visible = true
          currentText.alpha = 1
        }
        
        if (appRef.current) {
          appRef.current.render()
        }
        
        previousSceneIndexRef.current = sceneIndex
        
        setTimeout(() => {
          wrappedOnComplete()
        }, 50)
        
        return
      }
      
      // 현재 씬을 컨테이너에 추가
      if (!containerRef.current) {
        console.error(`[updateCurrentScene] containerRef.current가 null - sceneIndex: ${sceneIndex}`)
        return
      }
      
      // 같은 그룹 내에서는 첫 번째 씬의 스프라이트 사용
      // 같은 그룹 내 씬인 경우 먼저 spriteToUse를 확실히 표시하여 검은 화면 방지
      if (isInSameGroup) {
        // 컨테이너에 추가되어 있는지 확인
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }
        // 즉시 visible/alpha 설정하여 검은 화면 방지
        spriteToUse.visible = true
        spriteToUse.alpha = 1
        // 먼저 렌더링하여 이미지가 보이도록 보장
        if (appRef.current) {
          appRef.current.render()
        }
      } else {
        // 다른 그룹인 경우
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }
      }
      
      // 현재 씬의 스프라이트는 숨기기 (같은 그룹 내에서는 첫 번째 씬의 스프라이트만 사용)
      // 같은 그룹 내 씬인 경우 currentSprite를 숨기지 않음 (spriteToUse와 같을 수 있음)
      if (currentSprite && currentSprite !== spriteToUse) {
        // 같은 그룹 내 씬인 경우 currentSprite가 spriteToUse와 다르더라도 숨기지 않음
        // 왜냐하면 같은 그룹 내에서는 spriteToUse만 사용하므로
        if (!isInSameGroup) {
          currentSprite.visible = false
          currentSprite.alpha = 0
        }
      }
      
      if (currentText && currentText.parent !== containerRef.current) {
        if (currentText.parent) {
          currentText.parent.removeChild(currentText)
        }
        containerRef.current.addChild(currentText)
      }
      
      // 모든 다른 씬들 숨기기
      // 같은 그룹 내 씬인 경우 spriteToUse(firstSceneSprite)는 절대 숨기지 않음
      spritesRef.current.forEach((sprite, idx) => {
        if (!sprite) return
        
        // spriteToUse는 절대 숨기지 않음
        if (sprite === spriteToUse) {
          return
        }
        
        // 같은 그룹 내 씬인 경우 firstSceneSprite도 절대 숨기지 않음
        if (isInSameGroup && firstSceneSprite && sprite === firstSceneSprite) {
          return
        }
        
        // 현재 씬 인덱스가 아니고 spriteToUse가 아닌 경우에만 숨기기
        if (idx !== sceneIndex) {
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
      
      // 현재 씬 visible 설정 및 alpha 초기화
      // 같은 그룹 내 씬이 아닌 경우에만 alpha를 0으로 설정 (전환 효과를 위해)
      if (!isInSameGroup) {
        spriteToUse.visible = true
        spriteToUse.alpha = 0
      }
      // 같은 그룹 내 씬인 경우는 위에서 이미 설정했으므로 여기서는 건드리지 않음
      
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 0
      }

      // 고급 효과 적용
      if (currentScene.advancedEffects) {
        applyAdvancedEffects(spriteToUse, sceneIndex, currentScene.advancedEffects)
      }
      
      // 고급 효과 적용 후에도 스프라이트가 컨테이너에 있는지 확인
      if (!spriteToUse.parent && containerRef.current) {
        containerRef.current.addChild(spriteToUse)
      }
      if (currentText && !currentText.parent && containerRef.current) {
        containerRef.current.addChild(currentText)
      }

      // 전환 효과 적용 전에 한 번 렌더링
      if (appRef.current) {
        appRef.current.render()
      }
      
      // "움직임" 효과인 경우 그룹의 첫 번째 씬인지 확인
      const isCurrentTransitionMovement = MOVEMENT_EFFECTS.includes(transition)
      const isFirstInGroup = isCurrentTransitionMovement && currentScene.sceneId && isFirstSceneInGroup
      
      // 그룹이 끝나고 다음 그룹으로 넘어갈 때 이전 그룹의 Timeline 정리
      if (previousScene && previousScene.sceneId !== currentScene.sceneId) {
        const previousGroupTimeline = groupTransitionTimelinesRef.current.get(previousScene.sceneId)
        if (previousGroupTimeline) {
          previousGroupTimeline.kill()
          groupTransitionTimelinesRef.current.delete(previousScene.sceneId)
        }
      }
      
      // 전환 효과 적용
      // 같은 그룹 내 씬인 경우: 같은 이미지 위에 자막만 변경하되, 전환 효과는 계속 진행
      if (isInSameGroup && !isFirstSceneInGroup) {
        // 같은 그룹 내 씬: 이미지 전환 효과는 계속 진행, 자막만 변경
        // 첫 번째 씬의 transition 사용, 현재 씬의 duration 사용
        const firstSceneInGroup = timeline.scenes[firstSceneIndex]
        const groupTransition = firstSceneInGroup?.transition || 'fade'
        const sceneDuration = currentScene.duration && currentScene.duration > 0
          ? currentScene.duration
          : 0.5
        
        // 자막 내용이 수정되었을 수 있으므로 텍스트 내용 업데이트
        if (currentText && currentScene.text?.content) {
          // ||| 구분자가 있으면 현재 구간만 표시 (재생 로직에서 partIndex 전달 시 처리)
          // 일단은 전체 텍스트 표시 (나중에 재생 로직에서 구간별로 업데이트)
          const textToDisplay = currentScene.text.content
          
          // 텍스트 내용이 변경되었으면 업데이트
          if (currentText.text !== textToDisplay) {
            currentText.text = textToDisplay
          }
          // 같은 그룹 내 씬 전환 시 텍스트는 즉시 표시 (깜빡임 방지)
          currentText.visible = true
          currentText.alpha = 1
        }
        
        // 이전 텍스트 숨기기 (새 텍스트를 보여준 후)
        if (previousText && previousIndex !== null && previousIndex !== sceneIndex) {
          previousText.visible = false
          previousText.alpha = 0
        }
        
        // 텍스트 변경을 먼저 렌더링하여 깜빡임 방지
        if (appRef.current) {
          appRef.current.render()
        }
        
        // 현재 씬의 duration만큼 전환 효과 적용 (이미지는 계속 움직임, 텍스트는 이미 표시됨)
        applyEnterEffect(
          spriteToUse,
          null, // 같은 그룹 내 씬 전환 시 텍스트는 이미 표시했으므로 null 전달
          groupTransition,
          sceneDuration,
          width,
          height,
          sceneIndex,
          applyAdvancedEffects,
          forceTransition,
          () => {
            previousSceneIndexRef.current = sceneIndex
            wrappedOnComplete()
          },
          previousIndex,
          groupTransitionTimelinesRef,
          currentScene.sceneId
        )
      } else {
        // 첫 번째 씬이거나 다른 그룹: 전환 효과 적용
        // 자막 내용이 수정되었을 수 있으므로 텍스트 내용 업데이트
        if (currentText && currentScene.text?.content) {
          // ||| 구분자가 있으면 현재 구간만 표시 (재생 로직에서 partIndex 전달 시 처리)
          // 일단은 전체 텍스트 표시 (나중에 재생 로직에서 구간별로 업데이트)
          const textToDisplay = currentScene.text.content
          
          // 텍스트 내용이 변경되었으면 업데이트
          if (currentText.text !== textToDisplay) {
            currentText.text = textToDisplay
          }
        }
        
        applyEnterEffect(
          spriteToUse,
          currentText || null,
          transition,
          transitionDuration,
          width,
          height,
          sceneIndex,
          applyAdvancedEffects,
          forceTransition,
          () => {
            previousSceneIndexRef.current = sceneIndex
            wrappedOnComplete()
          },
          previousIndex,
          isFirstInGroup ? groupTransitionTimelinesRef : undefined,
          currentScene.sceneId
        )
      }
    } else {
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
          const params = calculateSpriteParams(img.width, img.height, width, height, scene.imageFit || 'contain')
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
      const baseFontSize = scene.text.fontSize || 48
      const scaledFontSize = baseFontSize * scale
      const fontFamily = resolveSubtitleFontFamily(scene.text.font)
      const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
      
      const textObj = new fabric.Textbox(scene.text.content, {
        left: (transform?.x ?? width / 2) * scale,
        top: (transform?.y ?? height * 0.9) * scale,
        originX: 'center',
        originY: 'center',
        fontFamily,
        fontSize: scaledFontSize,
        fill: scene.text.color || '#ffffff',
        fontWeight,
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
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지와 스프라이트를 공유
        const firstSceneIndexInGroup = scene.sceneId !== undefined
          ? timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
          : -1
        const isFirstSceneInGroup = firstSceneIndexInGroup === sceneIndex
        
        // 첫 번째 씬이 아니고 같은 그룹 내에 스프라이트가 이미 있으면 공유
        if (!isFirstSceneInGroup && firstSceneIndexInGroup >= 0) {
          const firstSceneSprite = spritesRef.current.get(firstSceneIndexInGroup)
          if (firstSceneSprite) {
            // 같은 그룹 내 씬들은 첫 번째 씬의 스프라이트를 참조
            spritesRef.current.set(sceneIndex, firstSceneSprite)
            return
          }
        }
        
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
        const firstSceneInGroup = firstSceneIndexInGroup >= 0 
          ? timeline.scenes[firstSceneIndexInGroup] 
          : null
        const imageToUse = firstSceneInGroup?.image || scene.image
        const baseScene = firstSceneInGroup || scene
        
        // 첫 번째 씬이거나 같은 그룹 내 스프라이트가 없으면 새로 생성
        // 같은 그룹 내 씬들은 첫 번째 씬의 이미지를 사용
        const texture = await loadPixiTextureWithCache(imageToUse)
        const sprite = new PIXI.Sprite(texture)
        
        const imageFit = baseScene.imageFit || 'contain'
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

        // Transform 데이터 적용 (첫 번째 씬의 transform 사용)
        if (baseScene.imageTransform) {
          sprite.x = baseScene.imageTransform.x
          sprite.y = baseScene.imageTransform.y
          sprite.width = baseScene.imageTransform.width
          sprite.height = baseScene.imageTransform.height
          sprite.rotation = baseScene.imageTransform.rotation
        }

        container.addChild(sprite)
        spritesRef.current.set(sceneIndex, sprite)

        if (scene.text?.content) {
          const fontFamily = resolveSubtitleFontFamily(scene.text.font)
          const fontWeight = scene.text.fontWeight ?? (scene.text.style?.bold ? 700 : 400)
          // 텍스트 너비 계산 (Transform이 있으면 그 너비 사용, 없으면 기본값)
          let textWidth = width * 0.75 // 기본값: 화면 너비의 75%
          if (scene.text.transform?.width) {
            textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
          }

          // strokeThickness를 포함한 스타일 객체 생성
          const styleConfig: Record<string, unknown> = {
            fontFamily,
            fontSize: scene.text.fontSize || 80, // 기본 크기 32 -> 48로 증가
            fill: scene.text.color || '#ffffff',
            align: scene.text.style?.align || 'center',
            fontWeight: String(fontWeight) as PIXI.TextStyleFontWeight,
            fontStyle: scene.text.style?.italic ? 'italic' : 'normal',
            wordWrap: true, // 자동 줄바꿈 활성화
            wordWrapWidth: textWidth, // 줄바꿈 너비 설정
            breakWords: true, // 단어 중간에서도 줄바꿈 가능
            stroke: '#000000', // 쉐도우 대신 테두리(border) 사용
            strokeThickness: 10, // 테두리 두께 10픽셀 (서버 인코딩과 동일)
          }
          const textStyle = new PIXI.TextStyle(styleConfig as Partial<PIXI.TextStyle>)

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
            
            // Transform이 있으면 wordWrapWidth도 업데이트
            if (text.style && scene.text.transform.width) {
              const baseWidth = scene.text.transform.width / scaleX
              text.style.wordWrapWidth = baseWidth
              text.text = text.text // 스타일 변경 적용
            }
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
