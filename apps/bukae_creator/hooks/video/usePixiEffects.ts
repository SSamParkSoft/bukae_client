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
    onComplete?: () => void,
    previousIndex?: number | null // 추가
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

    // 스프라이트 초기 상태 설정 (visible: true, alpha: 0)
    // 이렇게 하면 검은 화면이 아닌 투명한 상태로 시작하여 전환 효과가 부드럽게 시작됨
    toSprite.visible = true
    toSprite.alpha = 0
    if (toText) {
      toText.visible = true
      toText.alpha = 0
    }
    
    // 초기 상태 렌더링 (스프라이트가 visible: true, alpha: 0인 상태로 렌더링)
    if (appRef.current) {
      appRef.current.render()
    }

    // Timeline 생성 (이전 코드처럼 자동 재생되도록 - paused 옵션 없음)
    const tl = gsap.timeline({
      onStart: () => {
        console.log(`[전환효과] GSAP animation started for scene ${sceneIndex}`)
      },
      onComplete: () => {
        console.log(`[전환효과] GSAP animation completed for scene ${sceneIndex}`)
        
        // 전환 효과 완료 후 이전 씬 숨기기
        // 이전 씬 인덱스는 updateCurrentScene에서 전달받아야 함
        // 하지만 현재는 직접 접근할 수 없으므로, onComplete 콜백에서 처리하도록 해야 함
        
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
    
    // 텍스트는 항상 페이드로 처리
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
    
    // 전환 효과별 처리 (이미지만 적용, 텍스트는 항상 페이드)
    switch (actualTransition) {
      case 'fade':
        {
          // 이전 코드 패턴: 객체를 사용하고 onUpdate에서 직접 업데이트
          const fadeObj = { alpha: 0 }
          let hasWarnedAboutParent = false
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          // 텍스트도 함께 페이드
          if (toText) {
            if (toText.mask) {
              toText.mask = null
            }
          }
          
          // 이전 코드처럼 onUpdate에서 직접 업데이트하고 렌더링
          tl.to(fadeObj, { 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 로그 간소화 (매 프레임마다 출력하지 않음)
              // console.log(`[전환효과] onUpdate 호출 - scene: ${sceneIndex}, alpha: ${fadeObj.alpha}`)
              
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                // parent가 null이거나 containerRef.current가 아니면 추가
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  // 경고는 한 번만 출력
                  if (!hasWarnedAboutParent) {
                    console.warn(`[전환효과] onUpdate에서 스프라이트가 컨테이너에 없음 - scene: ${sceneIndex}, 강제 추가`)
                    hasWarnedAboutParent = true
                  }
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                
                toSprite.alpha = fadeObj.alpha
                
                // 디버깅 로그도 간소화 (10프레임마다만 출력)
                // if (Math.floor(fadeObj.alpha * 100) % 10 === 0) {
                //   console.log(`[전환효과] 스프라이트 상태 - visible: ${toSprite.visible}, alpha: ${toSprite.alpha}, parent: ${toSprite.parent !== null}`)
                // }
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                toText.alpha = fadeObj.alpha
              }
              
              // PixiJS 렌더링 강제 실행
              if (appRef.current) {
                appRef.current.render()
                // console.log(`[전환효과] 렌더링 완료 - scene: ${sceneIndex}`) // 로그 간소화
              }
            },
            onComplete: function() {
              console.log(`[전환효과] Fade complete for scene ${sceneIndex}, final alpha:`, toSprite?.alpha)
              // 최종 렌더링
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'slide-left':
        {
          // 이전 코드 패턴: 슬라이드 좌 (왼쪽에서 나타남) - 이미지만 적용
          const toSlideLeftObj = { x: originalX - stageWidth, alpha: 0 }
          toSprite.x = originalX - stageWidth
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toSlideLeftObj, { 
            x: originalX, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.x = toSlideLeftObj.x
                toSprite.alpha = toSlideLeftObj.alpha
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'slide-right':
        {
          // 이전 코드 패턴: 슬라이드 우 (오른쪽에서 나타남) - 이미지만 적용
          const toSlideRightObj = { x: originalX + stageWidth, alpha: 0 }
          toSprite.x = originalX + stageWidth
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toSlideRightObj, { 
            x: originalX, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.x = toSlideRightObj.x
                toSprite.alpha = toSlideRightObj.alpha
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'slide-up':
        {
          // 이전 코드 패턴: 슬라이드 상 (아래에서 나타남) - 이미지만 적용
          const toSlideUpObj = { y: originalY + stageHeight, alpha: 0 }
          toSprite.y = originalY + stageHeight
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toSlideUpObj, { 
            y: originalY, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.y = toSlideUpObj.y
                toSprite.alpha = toSlideUpObj.alpha
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'slide-down':
        {
          // 이전 코드 패턴: 슬라이드 하 (위에서 나타남) - 이미지만 적용
          const toSlideDownObj = { y: originalY - stageHeight, alpha: 0 }
          toSprite.y = originalY - stageHeight
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toSlideDownObj, { 
            y: originalY, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.y = toSlideDownObj.y
                toSprite.alpha = toSlideDownObj.alpha
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'zoom-in':
        {
          // 이전 코드 패턴: 확대 (작은 크기에서 확대) - 이미지만 적용
          const toZoomObj = { scale: 0.5, alpha: 0 }
          toSprite.scale.set(0.5, 0.5)
          toSprite.x = originalX + (toSprite.width * 0.25)
          toSprite.y = originalY + (toSprite.height * 0.25)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toZoomObj, { 
            scale: 1, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                const scaleFactor = toZoomObj.scale
                toSprite.scale.set(scaleFactor, scaleFactor)
                toSprite.x = originalX + (toSprite.width * (1 - scaleFactor) / 2)
                toSprite.y = originalY + (toSprite.height * (1 - scaleFactor) / 2)
                toSprite.alpha = toZoomObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'zoom-out':
        {
          // 이전 코드 패턴: 축소 (큰 크기에서 축소) - 이미지만 적용
          const toZoomOutObj = { scale: 1.5, alpha: 0 }
          toSprite.scale.set(1.5, 1.5)
          toSprite.x = originalX - (toSprite.width * 0.25)
          toSprite.y = originalY - (toSprite.height * 0.25)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toZoomOutObj, { 
            scale: 1, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                const scaleFactor = toZoomOutObj.scale
                toSprite.scale.set(scaleFactor, scaleFactor)
                toSprite.x = originalX - (toSprite.width * (scaleFactor - 1) / 2)
                toSprite.y = originalY - (toSprite.height * (scaleFactor - 1) / 2)
                toSprite.alpha = toZoomOutObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'rotate':
        {
          // 이전 코드 패턴: 회전 (회전하며 나타남) - 이미지만 적용
          const toRotateObj = { rotation: -Math.PI * 2, alpha: 0 }
          toSprite.rotation = -Math.PI * 2
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toRotateObj, { 
            rotation: 0, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.rotation = toRotateObj.rotation
                toSprite.alpha = toRotateObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'blur':
        {
          // 이전 코드 패턴: 블러 (블러에서 선명하게) - 이미지만 적용
          const toBlurFilter = new PIXI.BlurFilter()
          toBlurFilter.blur = 20
          toSprite.filters = [toBlurFilter]
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          const toBlurObj = { blur: 20, alpha: 0 }
          tl.to(toBlurObj, { 
            blur: 0, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toBlurFilter.blur = toBlurObj.blur
                toSprite.alpha = toBlurObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'glitch':
        {
          // 이전 코드 패턴: 글리치 (랜덤 위치 이동하며 나타남) - 이미지만 적용
          const glitchObj = { x: originalX, alpha: 0 }
          toSprite.x = originalX
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          const glitchAnim = () => {
            const offset = (Math.random() - 0.5) * 20
            gsap.to(glitchObj, { 
              x: originalX + offset, 
              duration: 0.05, 
              yoyo: true, 
              repeat: 5, 
              onUpdate: function() {
                if (toSprite) {
                  toSprite.x = glitchObj.x
                }
                if (appRef.current) {
                  appRef.current.render()
                }
              }
            })
          }
          glitchAnim()
          
          tl.to(glitchObj, { 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.alpha = glitchObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'ripple':
        {
          // 이전 코드 패턴: 물결 효과 (작은 크기에서 확장) - 이미지만 적용
          const toRippleObj = { scale: 0.8, alpha: 0 }
          toSprite.scale.set(0.8, 0.8)
          toSprite.x = originalX + (toSprite.width * 0.1)
          toSprite.y = originalY + (toSprite.height * 0.1)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          tl.to(toRippleObj, { 
            scale: 1, 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                const scaleFactor = toRippleObj.scale
                toSprite.scale.set(scaleFactor, scaleFactor)
                toSprite.x = originalX + (toSprite.width * (1 - scaleFactor) / 2)
                toSprite.y = originalY + (toSprite.height * (1 - scaleFactor) / 2)
                toSprite.alpha = toRippleObj.alpha
              }
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'circle':
        {
          // 이전 코드 패턴: 원형 마스크 확장 (중앙에서 원형으로 확장) - 이미지만 적용
          // circle 케이스는 alpha: 1로 설정해야 함 (마스크로 보이기 때문)
          const circleMask = new PIXI.Graphics()
          circleMask.beginFill(0xffffff)
          circleMask.drawCircle(stageWidth / 2, stageHeight / 2, 0)
          circleMask.endFill()
          toSprite.mask = circleMask
          toSprite.alpha = 1
          // visible은 이미 위에서 설정됨
          
          const maskRadius = { value: 0 }
          const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
          
          tl.to(maskRadius, { 
            value: maxRadius,
            duration,
            onUpdate: function() {
              circleMask.clear()
              circleMask.beginFill(0xffffff)
              circleMask.drawCircle(stageWidth / 2, stageHeight / 2, maskRadius.value)
              circleMask.endFill()
              if (appRef.current) {
                appRef.current.render()
              }
            }
          })
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      default:
        // 이전 코드 패턴: 기본 페이드
        {
          const defaultFadeObj = { alpha: 0 }
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          // 텍스트도 이미 위에서 설정됨
          
          tl.to(defaultFadeObj, { 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              if (toSprite) {
                toSprite.alpha = defaultFadeObj.alpha
              }
              if (toText) {
                toText.alpha = defaultFadeObj.alpha
              }
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
    }

    // 이전 코드 패턴: 애니메이션 완료 후 정리
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

    // 이전 코드 패턴: Timeline은 자동으로 시작됨 (기본값이 paused: false)
    // 하지만 명시적으로 시작을 보장하기 위해 requestAnimationFrame에서 확인
    requestAnimationFrame(() => {
      // Timeline이 실제로 시작되었는지 확인하고, 시작되지 않았으면 시작
      if (tl && tl.paused()) {
        console.log(`[전환효과] Timeline이 일시정지 상태 - scene: ${sceneIndex}, 강제 시작`)
        tl.play()
      }
      
      // 초기 상태 렌더링 (스프라이트가 visible: true, alpha: 0인 상태로 렌더링)
      if (appRef.current) {
        appRef.current.render()
      }
      
      // Timeline이 제대로 시작되었는지 확인
      console.log(`[전환효과] Timeline 상태 확인 - scene: ${sceneIndex}, paused: ${tl.paused()}, isActive: ${tl.isActive()}, progress: ${tl.progress()}`)
    })
  }, [appRef, containerRef, activeAnimationsRef, timeline, onAnimationComplete])

  return {
    applyAdvancedEffects,
    applyEnterEffect,
  }
}
