import { useCallback, useRef } from 'react'
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
}

export const usePixiEffects = ({
  appRef,
  containerRef,
  particlesRef,
  activeAnimationsRef,
  stageDimensions,
  timeline,
}: UsePixiEffectsParams) => {
  // 고급 효과 적용
  const applyAdvancedEffects = useCallback((
    sprite: PIXI.Sprite,
    sceneIndex: number,
    effects?: TimelineScene['advancedEffects']
  ) => {
    if (!effects || !appRef.current || !containerRef.current) return

    const filters: PIXI.Filter[] = []

    // Glow 효과
    if (effects.glow?.enabled) {
      const glowFilter = createGlowFilter(effects.glow.distance || 10)
      filters.push(glowFilter)
    }

    // Glitch 효과
    if (effects.glitch?.enabled) {
      const glitchFilter = createGlitchFilter(appRef.current, effects.glitch.intensity || 10)
      if (glitchFilter) {
        filters.push(glitchFilter)
      }
    }

    sprite.filters = filters.length > 0 ? filters : null

    // 파티클 효과
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

      // 파티클 애니메이션 완료 후 제거
      setTimeout(() => {
        if (particleSystem.parent) {
          particleSystem.parent.removeChild(particleSystem)
        }
        particlesRef.current.delete(sceneIndex)
      }, (effects.particles.duration || 2) * 1000)
    }
  }, [appRef, containerRef, particlesRef, stageDimensions])

  // 씬 등장 효과 함수들 (이미지가 나타날 때 적용)
  const applyEnterEffect = useCallback((
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    applyAdvancedEffectsFn: (sprite: PIXI.Sprite, sceneIndex: number, effects?: TimelineScene['advancedEffects']) => void
  ) => {
    console.log(`Step4: applyEnterEffect called for scene ${sceneIndex}, transition: ${transition}`)
    if (!toSprite) {
      console.log(`Step4: applyEnterEffect - no sprite for scene ${sceneIndex}`)
      return
    }

    // 이전 애니메이션 kill
    const prevAnim = activeAnimationsRef.current.get(sceneIndex)
    if (prevAnim) {
      prevAnim.kill()
      activeAnimationsRef.current.delete(sceneIndex)
    }

    const tl = gsap.timeline({
      onStart: () => {
        console.log(`Step4: GSAP animation started for scene ${sceneIndex}`)
      },
      onComplete: () => {
        console.log(`Step4: GSAP animation completed for scene ${sceneIndex}`)
      }
    })
    activeAnimationsRef.current.set(sceneIndex, tl)
    
    // 원래 위치 저장
    const originalSpriteX = toSprite.x
    const originalSpriteY = toSprite.y
    
    const originalTextX = toText ? toText.x : 0
    const originalTextY = toText ? toText.y : 0
    
    // 기본 설정: toSprite는 시작 시 보이지 않음
    console.log(`Step4: Setting sprite ${sceneIndex} to visible=true, alpha=0`)
    if (toSprite) {
      toSprite.visible = true
      toSprite.alpha = 0
    }
    if (toText) {
      toText.visible = true
      toText.alpha = 0
    }

    switch (transition) {
      case 'fade':
        // 페이드
        console.log(`Step4: Applying fade effect for scene ${sceneIndex}`)
        const fadeObj = { alpha: 0 }
        tl.to(fadeObj, { 
          alpha: 1, 
          duration, 
          onUpdate: function() {
            if (toSprite) {
              toSprite.alpha = fadeObj.alpha
            }
            if (toText) {
              toText.alpha = fadeObj.alpha
            }
            // PixiJS 렌더링 강제 실행
            if (appRef.current) {
              appRef.current.render()
            }
          },
          onComplete: function() {
            console.log(`Step4: Fade complete for scene ${sceneIndex}, final alpha:`, toSprite?.alpha)
            // 최종 렌더링
            if (appRef.current) {
              appRef.current.render()
            }
          }
        }, 0)
        break

      case 'slide-left':
        // 슬라이드 좌 (왼쪽에서 나타남)
        const toSlideLeftObj = { x: originalSpriteX - stageWidth, alpha: 0 }
        toSprite.x = originalSpriteX - stageWidth
        if (toText) {
          toText.x = originalTextX - stageWidth
        }
        tl.to(toSlideLeftObj, { x: originalSpriteX, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.x = toSlideLeftObj.x
            toSprite.alpha = toSlideLeftObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideLeftObj = { x: originalTextX - stageWidth, alpha: 0 }
          tl.to(toTextSlideLeftObj, { x: originalTextX, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.x = toTextSlideLeftObj.x
              toText.alpha = toTextSlideLeftObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-right':
        // 슬라이드 우 (오른쪽에서 나타남)
        const toSlideRightObj = { x: originalSpriteX + stageWidth, alpha: 0 }
        toSprite.x = originalSpriteX + stageWidth
        if (toText) {
          toText.x = originalTextX + stageWidth
        }
        tl.to(toSlideRightObj, { x: originalSpriteX, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.x = toSlideRightObj.x
            toSprite.alpha = toSlideRightObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideRightObj = { x: originalTextX + stageWidth, alpha: 0 }
          tl.to(toTextSlideRightObj, { x: originalTextX, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.x = toTextSlideRightObj.x
              toText.alpha = toTextSlideRightObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-up':
        // 슬라이드 상 (아래에서 나타남)
        const toSlideUpObj = { y: originalSpriteY + stageHeight, alpha: 0 }
        toSprite.y = originalSpriteY + stageHeight
        if (toText) {
          toText.y = originalTextY + stageHeight
        }
        tl.to(toSlideUpObj, { y: originalSpriteY, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.y = toSlideUpObj.y
            toSprite.alpha = toSlideUpObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideUpObj = { y: originalTextY + stageHeight, alpha: 0 }
          tl.to(toTextSlideUpObj, { y: originalTextY, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.y = toTextSlideUpObj.y
              toText.alpha = toTextSlideUpObj.alpha
            }
          }}, 0)
        }
        break

      case 'slide-down':
        // 슬라이드 하 (위에서 나타남)
        const toSlideDownObj = { y: originalSpriteY - stageHeight, alpha: 0 }
        toSprite.y = originalSpriteY - stageHeight
        if (toText) {
          toText.y = originalTextY - stageHeight
        }
        tl.to(toSlideDownObj, { y: originalSpriteY, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.y = toSlideDownObj.y
            toSprite.alpha = toSlideDownObj.alpha
          }
        }}, 0)
        if (toText) {
          const toTextSlideDownObj = { y: originalTextY - stageHeight, alpha: 0 }
          tl.to(toTextSlideDownObj, { y: originalTextY, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.y = toTextSlideDownObj.y
              toText.alpha = toTextSlideDownObj.alpha
            }
          }}, 0)
        }
        break

      case 'zoom-in':
        // 확대 (작은 크기에서 확대)
        const toZoomObj = { scale: 0.5, alpha: 0 }
        toSprite.scale.set(0.5, 0.5)
        toSprite.x = originalSpriteX + (toSprite.width * 0.25)
        toSprite.y = originalSpriteY + (toSprite.height * 0.25)
        if (toText) {
          toText.scale.set(0.5, 0.5)
        }
        tl.to(toZoomObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toZoomObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX + (toSprite.width * (1 - scaleFactor) / 2)
            toSprite.y = originalSpriteY + (toSprite.height * (1 - scaleFactor) / 2)
            toSprite.alpha = toZoomObj.alpha
          }
          if (toText) {
            toText.scale.set(toZoomObj.scale, toZoomObj.scale)
            toText.alpha = toZoomObj.alpha
          }
        }}, 0)
        break

      case 'zoom-out':
        // 축소 (큰 크기에서 축소)
        const toZoomOutObj = { scale: 1.5, alpha: 0 }
        toSprite.scale.set(1.5, 1.5)
        toSprite.x = originalSpriteX - (toSprite.width * 0.25)
        toSprite.y = originalSpriteY - (toSprite.height * 0.25)
        if (toText) {
          toText.scale.set(1.5, 1.5)
        }
        tl.to(toZoomOutObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toZoomOutObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX - (toSprite.width * (scaleFactor - 1) / 2)
            toSprite.y = originalSpriteY - (toSprite.height * (scaleFactor - 1) / 2)
            toSprite.alpha = toZoomOutObj.alpha
          }
          if (toText) {
            toText.scale.set(toZoomOutObj.scale, toZoomOutObj.scale)
            toText.alpha = toZoomOutObj.alpha
          }
        }}, 0)
        break

      case 'rotate':
        // 회전 (회전하며 나타남)
        const toRotateObj = { rotation: -Math.PI * 2, alpha: 0 }
        toSprite.rotation = -Math.PI * 2
        if (toText) {
          toText.rotation = -Math.PI * 2
        }
        tl.to(toRotateObj, { rotation: 0, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.rotation = toRotateObj.rotation
            toSprite.alpha = toRotateObj.alpha
          }
        }}, 0)
        if (toText) {
          tl.to(toRotateObj, { rotation: 0, alpha: 1, duration, onUpdate: function() {
            if (toText) {
              toText.rotation = toRotateObj.rotation
              toText.alpha = toRotateObj.alpha
            }
          }}, 0)
        }
        break

      case 'blur':
        // 블러 (블러에서 선명하게)
        const toBlurFilter = new PIXI.BlurFilter()
        toBlurFilter.blur = 20
        toSprite.filters = [toBlurFilter]
        const toBlurObj = { blur: 20, alpha: 0 }
        tl.to(toBlurObj, { blur: 0, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toBlurFilter.blur = toBlurObj.blur
            toSprite.alpha = toBlurObj.alpha
          }
          if (toText) {
            toText.alpha = toBlurObj.alpha
          }
        }}, 0)
        break

      case 'glitch':
        // 글리치 (랜덤 위치 이동하며 나타남)
        const glitchObj = { x: originalSpriteX, alpha: 0 }
        toSprite.x = originalSpriteX
        const glitchAnim = () => {
          const offset = (Math.random() - 0.5) * 20
          gsap.to(glitchObj, { x: originalSpriteX + offset, duration: 0.05, yoyo: true, repeat: 5, onUpdate: function() {
            if (toSprite) {
              toSprite.x = glitchObj.x
            }
          }})
        }
        glitchAnim()
        tl.to(glitchObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = glitchObj.alpha
          }
          if (toText) {
            toText.alpha = glitchObj.alpha
          }
        }}, 0)
        break

      case 'ripple':
        // 물결 효과 (작은 크기에서 확장)
        const toRippleObj = { scale: 0.8, alpha: 0 }
        toSprite.scale.set(0.8, 0.8)
        toSprite.x = originalSpriteX + (toSprite.width * 0.1)
        toSprite.y = originalSpriteY + (toSprite.height * 0.1)
        tl.to(toRippleObj, { scale: 1, alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            const scaleFactor = toRippleObj.scale
            toSprite.scale.set(scaleFactor, scaleFactor)
            toSprite.x = originalSpriteX + (toSprite.width * (1 - scaleFactor) / 2)
            toSprite.y = originalSpriteY + (toSprite.height * (1 - scaleFactor) / 2)
            toSprite.alpha = toRippleObj.alpha
          }
          if (toText) {
            toText.alpha = toRippleObj.alpha
          }
        }}, 0)
        break

      case 'circle':
        // 원형 마스크 확장 (중앙에서 원형으로 확장)
        const circleMask = new PIXI.Graphics()
        circleMask.beginFill(0xffffff)
        circleMask.drawCircle(stageWidth / 2, stageHeight / 2, 0)
        circleMask.endFill()
        toSprite.mask = circleMask
        const maskRadius = { value: 0 }
        const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
        const circleAlphaObj = { alpha: 0 }
        tl.to(maskRadius, { 
          value: maxRadius,
          duration,
          onUpdate: function() {
            circleMask.clear()
            circleMask.beginFill(0xffffff)
            circleMask.drawCircle(stageWidth / 2, stageHeight / 2, maskRadius.value)
            circleMask.endFill()
          }
        })
        tl.to(circleAlphaObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = circleAlphaObj.alpha
          }
          if (toText) {
            toText.alpha = circleAlphaObj.alpha
          }
        }}, 0)
        break

      default:
        // 기본: 페이드
        const defaultFadeObj = { alpha: 0 }
        tl.to(defaultFadeObj, { alpha: 1, duration, onUpdate: function() {
          if (toSprite) {
            toSprite.alpha = defaultFadeObj.alpha
          }
          if (toText) {
            toText.alpha = defaultFadeObj.alpha
          }
        }}, 0)
    }

    // 애니메이션 완료 후 정리
    tl.call(() => {
      activeAnimationsRef.current.delete(sceneIndex)
      if (appRef.current) {
        appRef.current.render()
      }
    })

    // 고급 효과 적용
    if (toSprite && timeline) {
      const scene = timeline.scenes[sceneIndex]
      if (scene?.advancedEffects) {
        applyAdvancedEffectsFn(toSprite, sceneIndex, scene.advancedEffects)
      }
    }
  }, [appRef, activeAnimationsRef, timeline])

  return {
    applyAdvancedEffects,
    applyEnterEffect,
  }
}

