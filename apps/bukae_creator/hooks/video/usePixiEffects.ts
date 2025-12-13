import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { createGlowFilter, createGlitchFilter, createParticleSystem } from '@/utils/pixi'

interface UsePixiEffectsParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  particlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  stageDimensions: { width: number; height: number }
  timeline: TimelineData | null
  onAnimationComplete?: (sceneIndex: number) => void
}

export const usePixiEffects = ({
  appRef,
  containerRef,
  particlesRef,
  activeAnimationsRef,
  stageDimensions,
  timeline,
  onAnimationComplete,
}: UsePixiEffectsParams) => {
  // 고급 효과 적용
  const applyAdvancedEffects = useCallback((
    sprite: PIXI.Sprite,
    sceneIndex: number,
    effects?: TimelineScene['advancedEffects']
  ) => {
    if (!effects || !appRef.current || !containerRef.current) return

    const filters: PIXI.Filter[] = []

    if (effects.glow?.enabled) {
      const glowFilter = createGlowFilter(effects.glow.distance || 10)
      filters.push(glowFilter)
    }

    if (effects.glitch?.enabled) {
      const glitchFilter = createGlitchFilter(appRef.current, effects.glitch.intensity || 10)
      if (glitchFilter) {
        filters.push(glitchFilter)
      }
    }

    sprite.filters = filters.length > 0 ? filters : null

    if (effects.particles?.enabled && effects.particles.type) {
      const existingParticles = particlesRef.current.get(sceneIndex)
      if (existingParticles && existingParticles.parent) {
        existingParticles.parent.removeChild(existingParticles)
        particlesRef.current.delete(sceneIndex)
      }

      const particleSystem = createParticleSystem(
        effects.particles.type,
        effects.particles.count || 50,
        stageDimensions.width,
        stageDimensions.height,
        effects.particles.duration || 2
      )

      containerRef.current.addChild(particleSystem)
      particlesRef.current.set(sceneIndex, particleSystem)

      setTimeout(() => {
        if (particleSystem.parent) {
          particleSystem.parent.removeChild(particleSystem)
        }
        particlesRef.current.delete(sceneIndex)
      }, (effects.particles.duration || 2) * 1000)
    }
  }, [appRef, containerRef, particlesRef, stageDimensions])

  // 전환 효과 적용 - 완전히 새로 작성
  const applyEnterEffect = useCallback((
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    applyAdvancedEffectsFn: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void,
    forceTransition?: string,
    onComplete?: () => void
  ) => {
    const actualTransition = (forceTransition || transition || 'fade').trim().toLowerCase()
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:89',message:'applyEnterEffect 시작',data:{sceneIndex,transition:actualTransition,toSpriteVisible:toSprite?.visible,toSpriteAlpha:toSprite?.alpha,toTextVisible:toText?.visible,toTextAlpha:toText?.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    
    if (!toSprite || !appRef.current || !containerRef.current) {
      console.error(`[전환효과] 필수 요소 없음`)
      return
    }
    
    // 이전 애니메이션 정리
    const existingAnim = activeAnimationsRef.current.get(sceneIndex)
    if (existingAnim) {
      existingAnim.kill()
      activeAnimationsRef.current.delete(sceneIndex)
    }

    // 컨테이너에 추가
    if (toSprite.parent !== containerRef.current) {
      if (toSprite.parent) {
      toSprite.parent.removeChild(toSprite)
    }
      containerRef.current.addChild(toSprite)
    }
    
    if (toText && toText.parent !== containerRef.current) {
      if (toText.parent) {
        toText.parent.removeChild(toText)
      }
        containerRef.current.addChild(toText)
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:116',message:'스프라이트 컨테이너 추가 확인',data:{sceneIndex,toSpriteParent:toSprite.parent !== null,toSpriteVisible:toSprite.visible,toSpriteAlpha:toSprite.alpha,containerHasSprite:containerRef.current?.children.includes(toSprite)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion

    // 원래 위치 계산
    let originalX = toSprite.x
    let originalY = toSprite.y
    
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      originalX = transform.x
      originalY = transform.y
    }

    console.log(`[전환효과] 시작 - scene: ${sceneIndex}, transition: ${actualTransition}, duration: ${duration}`)

    // Timeline 생성
    const tl = gsap.timeline({
      paused: true,
      onComplete: () => {
        if (toSprite) {
          toSprite.visible = true
          toSprite.alpha = 1
        }
        if (toText) {
          toText.visible = true
          toText.alpha = 1
        }
        if (appRef.current) {
          appRef.current.render()
        }
        activeAnimationsRef.current.delete(sceneIndex)
        // 전달된 onComplete 콜백이 있으면 우선 호출 (재생 중 다음 씬으로 넘어갈 때 사용)
        if (onComplete) {
          onComplete()
        }
        // 기존 onAnimationComplete도 호출 (다른 용도로 사용될 수 있음)
        if (onAnimationComplete) {
          onAnimationComplete(sceneIndex)
        }
      }
    })
    // Timeline을 즉시 activeAnimationsRef에 추가하여 updateCurrentScene(true)가 호출되어도 전환 효과를 건너뛰지 않도록 함
    activeAnimationsRef.current.set(sceneIndex, tl)
    
    // 텍스트 페이드
    const applyTextFade = () => {
      if (!toText) return
      const textFadeObj = { alpha: 0 }
      toText.alpha = 0
      toText.visible = true
      if (toText.mask) {
        toText.mask = null
      }
      tl.to(textFadeObj, {
        alpha: 1,
        duration,
        ease: 'none',
        onUpdate: function() {
          if (toText) {
            toText.alpha = textFadeObj.alpha
          }
          if (appRef.current) {
            appRef.current.render()
          }
        }
      }, 0)
    }

    // 전환 효과별 처리
    switch (actualTransition) {
      case 'fade':
        {
        const fadeObj = { alpha: 0 }
          toSprite.alpha = 0
          toSprite.visible = true
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:179',message:'fade 효과 초기 상태 설정',data:{sceneIndex,toSpriteAlpha:toSprite.alpha,toSpriteVisible:toSprite.visible,toTextAlpha:toText?.alpha,toTextVisible:toText?.visible},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
          // #endregion
          
          // 텍스트도 함께 페이드
        if (toText) {
          toText.alpha = 0
          toText.visible = true
            if (toText.mask) {
              toText.mask = null
        }
        }
        
        tl.to(fadeObj, { 
          alpha: 1, 
          duration,
          ease: 'none',
          onUpdate: function() {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:206',message:'fade onUpdate 호출',data:{sceneIndex,alpha:fadeObj.alpha,toSpriteAlpha:toSprite?.alpha,toSpriteVisible:toSprite?.visible,toSpriteParent:toSprite?.parent !== null,hasApp:appRef.current !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
              // #endregion
            if (toSprite) {
              toSprite.alpha = fadeObj.alpha
            }
            if (toText) {
              toText.alpha = fadeObj.alpha
            }
            // onUpdate에서 렌더링을 확실히 호출
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
              toSprite.alpha = 1
            }
            if (toText) {
              toText.alpha = 1
            }
            // 완료 시에도 렌더링
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
        }
        break

      case 'slide-left':
        {
          const startX = originalX - stageWidth
          const slideObj = { x: startX, alpha: 0 }
          
          toSprite.x = startX
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(slideObj, {
            x: originalX,
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.x = slideObj.x
                toSprite.alpha = slideObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
                toSprite.x = originalX
              toSprite.alpha = 1
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'slide-right':
        {
          const startX = originalX + stageWidth
          const slideObj = { x: startX, alpha: 0 }
          
          toSprite.x = startX
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(slideObj, {
            x: originalX,
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.x = slideObj.x
                toSprite.alpha = slideObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
                toSprite.x = originalX
              toSprite.alpha = 1
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'slide-up':
        {
          const startY = originalY + stageHeight
          const slideObj = { y: startY, alpha: 0 }
          
          toSprite.y = startY
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(slideObj, {
            y: originalY,
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.y = slideObj.y
                toSprite.alpha = slideObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
                toSprite.y = originalY
              toSprite.alpha = 1
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'slide-down':
        {
          const startY = originalY - stageHeight
          const slideObj = { y: startY, alpha: 0 }
          
          toSprite.y = startY
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(slideObj, {
            y: originalY,
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.y = slideObj.y
                toSprite.alpha = slideObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
                toSprite.y = originalY
              toSprite.alpha = 1
            }
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'zoom-in':
        {
          const zoomObj = { scale: 0.5, alpha: 0 }
        toSprite.scale.set(0.5, 0.5)
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(zoomObj, {
          scale: 1, 
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.scale.set(zoomObj.scale, zoomObj.scale)
                toSprite.alpha = zoomObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
              toSprite.scale.set(1, 1)
              toSprite.alpha = 1
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'zoom-out':
        {
          const zoomObj = { scale: 1.5, alpha: 0 }
        toSprite.scale.set(1.5, 1.5)
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(zoomObj, {
          scale: 1, 
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
            if (toSprite) {
                toSprite.scale.set(zoomObj.scale, zoomObj.scale)
                toSprite.alpha = zoomObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
              toSprite.scale.set(1, 1)
              toSprite.alpha = 1
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'rotate':
        {
          const rotateObj = { rotation: -Math.PI * 2, alpha: 0 }
        toSprite.rotation = -Math.PI * 2
        toSprite.alpha = 0
        toSprite.visible = true
          
          tl.to(rotateObj, {
            rotation: 0,
            alpha: 1,
            duration,
            ease: 'none',
            onUpdate: function() {
          if (toSprite) {
                toSprite.rotation = rotateObj.rotation
                toSprite.alpha = rotateObj.alpha
          }
          if (appRef.current) {
            appRef.current.render()
          }
            },
            onComplete: function() {
          if (toSprite) {
            toSprite.rotation = 0
            toSprite.alpha = 1
          }
          }
          }, 0)
          
        applyTextFade()
        }
        break

      case 'blur':
        {
          // 블러 효과: 블러에서 선명하게
          const blurFilter = new PIXI.BlurFilter()
          blurFilter.blur = 20
          toSprite.filters = [blurFilter]
        toSprite.alpha = 0
        toSprite.visible = true
          
          const blurObj = { blur: 20, alpha: 0 }
          
          tl.to(blurObj, {
            blur: 0,
            alpha: 1,
            duration,
            ease: 'none',
            onUpdate: function() {
              if (toSprite && blurFilter) {
                blurFilter.blur = blurObj.blur
                toSprite.alpha = blurObj.alpha
          }
          if (appRef.current) {
            appRef.current.render()
          }
            },
            onComplete: function() {
          if (toSprite) {
                toSprite.filters = null
            toSprite.alpha = 1
          }
          if (appRef.current) {
            appRef.current.render()
          }
            }
          }, 0)
          
        applyTextFade()
        }
        break

      case 'glitch':
        {
          // 글리치 효과: DisplacementFilter 사용
          const glitchFilter = createGlitchFilter(appRef.current, 20)
          if (glitchFilter) {
            toSprite.filters = [glitchFilter]
            const glitchObj = { intensity: 20, alpha: 0 }
        toSprite.alpha = 0
        toSprite.visible = true
            
            tl.to(glitchObj, {
              intensity: 0,
              alpha: 1,
              duration,
              ease: 'none',
              onUpdate: function() {
                if (toSprite && glitchFilter) {
                  glitchFilter.scale.x = glitchObj.intensity
                  glitchFilter.scale.y = glitchObj.intensity
                  toSprite.alpha = glitchObj.alpha
                }
        if (appRef.current) {
          appRef.current.render()
        }
              },
              onComplete: function() {
            if (toSprite) {
                  toSprite.filters = null
                  toSprite.alpha = 1
            }
            if (appRef.current) {
              appRef.current.render()
            }
              }
            }, 0)
          } else {
            // 글리치 필터 생성 실패 시 페이드
            const fadeObj = { alpha: 0 }
            toSprite.alpha = 0
            toSprite.visible = true
            tl.to(fadeObj, {
              alpha: 1,
              duration,
              ease: 'none',
              onUpdate: function() {
          if (toSprite) {
                  toSprite.alpha = fadeObj.alpha
          }
          if (appRef.current) {
            appRef.current.render()
          }
          }
            }, 0)
          }
          
        applyTextFade()
        }
        break

      case 'ripple':
        {
          // 물결 효과: 원형 마스크로 확장
          const centerX = stageWidth / 2
          const centerY = stageHeight / 2
          const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
          
          const maskGraphics = new PIXI.Graphics()
          maskGraphics.beginFill(0xffffff)
          maskGraphics.drawCircle(centerX, centerY, 0)
          maskGraphics.endFill()
          containerRef.current.addChild(maskGraphics)
          toSprite.mask = maskGraphics
        toSprite.alpha = 0
        toSprite.visible = true
          
          const rippleObj = { radius: 0, alpha: 0 }
          
          tl.to(rippleObj, {
            radius: maxRadius,
          alpha: 1, 
          duration, 
            ease: 'none',
          onUpdate: function() {
              if (maskGraphics) {
                maskGraphics.clear()
                maskGraphics.beginFill(0xffffff)
                maskGraphics.drawCircle(centerX, centerY, rippleObj.radius)
                maskGraphics.endFill()
              }
            if (toSprite) {
                toSprite.alpha = rippleObj.alpha
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
                toSprite.mask = null
              toSprite.alpha = 1
            }
              if (maskGraphics && maskGraphics.parent) {
                maskGraphics.parent.removeChild(maskGraphics)
              }
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
          
        applyTextFade()
        }
        break

      case 'circle':
        {
          // 원형 효과: 중심에서 원형으로 확장
          const centerX = stageWidth / 2
          const centerY = stageHeight / 2
        const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
          
          const maskGraphics = new PIXI.Graphics()
          maskGraphics.beginFill(0xffffff)
          maskGraphics.drawCircle(centerX, centerY, 0)
          maskGraphics.endFill()
          containerRef.current.addChild(maskGraphics)
          toSprite.mask = maskGraphics
          if (toText) {
            toText.mask = maskGraphics
          }
          toSprite.alpha = 1
          toSprite.visible = true
          
          const circleObj = { radius: 0 }
          
          tl.to(circleObj, {
            radius: maxRadius,
          duration,
            ease: 'none',
          onUpdate: function() {
              if (maskGraphics) {
                maskGraphics.clear()
                maskGraphics.beginFill(0xffffff)
                maskGraphics.drawCircle(centerX, centerY, circleObj.radius)
                maskGraphics.endFill()
            }
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            if (toSprite) {
              toSprite.mask = null
            }
              if (toText) {
                toText.mask = null
            }
              if (maskGraphics && maskGraphics.parent) {
                maskGraphics.parent.removeChild(maskGraphics)
              }
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
          
          // 텍스트는 페이드
        applyTextFade()
        }
        break

      default:
        // 기본 페이드
        {
          const fadeObj = { alpha: 0 }
          toSprite.alpha = 0
          toSprite.visible = true
        if (toText) {
          toText.alpha = 0
          toText.visible = true
        }
          
          tl.to(fadeObj, {
            alpha: 1,
            duration,
            ease: 'none',
            onUpdate: function() {
          if (toSprite) {
                toSprite.alpha = fadeObj.alpha
          }
          if (toText) {
                toText.alpha = fadeObj.alpha
          }
          if (appRef.current) {
            appRef.current.render()
          }
            }
          }, 0)
        }
    }

    // GSAP ticker로 렌더링 (Timeline이 시작되면 자동으로 렌더링)
    gsap.ticker.wake() // ticker 활성화
    let renderTicker: gsap.TickerCallback | null = null
    
    // Timeline이 시작되면 ticker에 렌더링 콜백 추가
    const startRenderTicker = () => {
      if (renderTicker) return // 이미 시작됨
      renderTicker = () => {
        if (!tl.paused() && appRef.current) {
          appRef.current.render()
        }
      }
      gsap.ticker.add(renderTicker)
      console.log(`[전환효과] GSAP ticker 렌더링 콜백 추가 - scene: ${sceneIndex}`)
    }
    
    const originalOnComplete = tl.eventCallback('onComplete')
    tl.eventCallback('onComplete', () => {
      if (originalOnComplete) originalOnComplete()
      if (renderTicker) {
        gsap.ticker.remove(renderTicker)
        renderTicker = null
        console.log(`[전환효과] GSAP ticker 렌더링 콜백 제거 - scene: ${sceneIndex}`)
      }
    })
    
    // 모든 애니메이션 추가 완료 후 Timeline 시작
    const timelineDuration = tl.duration()
    const childrenCount = tl.getChildren().length
    
    console.log(`[전환효과] Timeline 생성 완료 - duration: ${timelineDuration}, children: ${childrenCount}`)
    
    if (childrenCount > 0 && timelineDuration > 0) {
      // 초기 상태 렌더링 (반드시!)
      if (appRef.current) {
        appRef.current.render()
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:725',message:'Timeline 시작 전 초기 렌더링',data:{sceneIndex,childrenCount,timelineDuration,toSpriteAlpha:toSprite?.alpha,toSpriteVisible:toSprite?.visible},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Timeline 시작 (즉시 시작하여 전환 효과가 확실히 보이도록)
      // Timeline이 아직 유효한지 확인
      if (!toSprite || !appRef.current) {
        console.warn(`[전환효과] Timeline 시작 실패 - sprite나 app이 없음`, { sceneIndex, hasSprite: !!toSprite, hasApp: !!appRef.current })
        return
      }
      
      // GSAP ticker 활성화
      gsap.ticker.wake()
      
      // 초기 상태 렌더링
      if (appRef.current) {
        appRef.current.render()
      }
      
      // Timeline 시작 (requestAnimationFrame으로 다음 프레임에서 시작)
      requestAnimationFrame(() => {
        // Timeline 시작
        tl.play()
        
        // 렌더링 ticker 시작
        startRenderTicker()
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:732',message:'Timeline 시작됨',data:{sceneIndex,paused:tl.paused(),isActive:tl.isActive(),progress:tl.progress(),toSpriteAlpha:toSprite?.alpha,toSpriteVisible:toSprite?.visible,toSpriteParent:toSprite?.parent !== null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        console.log(`[전환효과] Timeline 시작됨 - paused: ${tl.paused()}, isActive: ${tl.isActive()}, progress: ${tl.progress()}`)
        
        // 시작 후 즉시 렌더링
        if (appRef.current) {
          appRef.current.render()
        }
        
        // 다음 프레임에서도 렌더링하여 애니메이션이 시작되는지 확인
        requestAnimationFrame(() => {
          if (appRef.current && !tl.paused()) {
            appRef.current.render()
          }
        })
      })
    } else {
      console.error(`[전환효과] Timeline에 애니메이션이 없음!`)
      if (toSprite) {
        toSprite.visible = true
        toSprite.alpha = 1
      }
      if (toText) {
        toText.visible = true
        toText.alpha = 1
      }
      if (appRef.current) {
        appRef.current.render()
      }
    }
  }, [appRef, containerRef, activeAnimationsRef, timeline, onAnimationComplete])

  return {
    applyAdvancedEffects,
    applyEnterEffect,
  }
}
