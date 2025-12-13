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
    forceTransition?: string
  ) => {
    const actualTransition = (forceTransition || transition || 'fade').trim().toLowerCase()
    
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

    // 원래 위치 계산
    let originalX = toSprite.x
    let originalY = toSprite.y
    
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      originalX = transform.x
      originalY = transform.y
    }

    console.log(`[전환효과] 시작 - scene: ${sceneIndex}, transition: ${actualTransition}, duration: ${duration}, 원래위치: (${originalX}, ${originalY})`)

    // Timeline 생성 및 즉시 시작
    const tl = gsap.timeline({
      paused: false, // 즉시 시작
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
        if (onAnimationComplete) {
          onAnimationComplete(sceneIndex)
        }
      }
    })
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
        }
        break

      case 'slide-down':
        {
          const startY = originalY - stageHeight
          const slideObj = { y: startY, alpha: 0 }
          
          console.log(`[전환효과] slide-down - startY: ${startY}, targetY: ${originalY}, stageHeight: ${stageHeight}`)
          
          toSprite.y = startY
          toSprite.alpha = 0
          toSprite.visible = true
          
          console.log(`[전환효과] slide-down 초기 설정 완료 - sprite.y: ${toSprite.y}, sprite.alpha: ${toSprite.alpha}`)
          
          tl.to(slideObj, {
            y: originalY,
            alpha: 1,
            duration,
            ease: 'none',
            onStart: function() {
              console.log(`[전환효과] slide-down Timeline onStart`)
            },
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
              console.log(`[전환효과] slide-down 완료`)
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
          
          if (appRef.current) {
            appRef.current.render()
            console.log(`[전환효과] slide-down 첫 렌더링 완료`)
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
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
          
          if (appRef.current) {
            appRef.current.render()
          }
        }
    }

    // GSAP ticker로 렌더링
    const renderTicker = gsap.ticker.add(() => {
      if (!tl.paused() && appRef.current) {
        appRef.current.render()
      }
    })

    const originalOnComplete = tl.eventCallback('onComplete')
    tl.eventCallback('onComplete', () => {
      if (originalOnComplete) originalOnComplete()
      requestAnimationFrame(() => {
        gsap.ticker.remove(renderTicker)
      })
    })

    // Timeline 상태 확인
    const timelineDuration = tl.duration()
    const childrenCount = tl.getChildren().length
    
    console.log(`[전환효과] Timeline 생성 완료 - duration: ${timelineDuration}, children: ${childrenCount}, paused: ${tl.paused()}, isActive: ${tl.isActive()}`)
    
    // Timeline이 paused: false로 생성되었으므로 자동으로 시작됨
    // 하지만 확실히 하기 위해 wake 호출
    gsap.ticker.wake()
    
    if (childrenCount === 0 || timelineDuration === 0) {
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
