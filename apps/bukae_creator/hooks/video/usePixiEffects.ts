import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import { applyFadeTransition } from './effects/transitions/fade'
import { applySlideTransition } from './effects/transitions/slide'
import { applyZoomTransition } from './effects/transitions/zoom'
import type { TransitionParams } from './effects/utils'
import { MOVEMENT_EFFECTS, type TransitionEffect } from './types/effects'

interface UsePixiEffectsParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  activeAnimationsRef: React.MutableRefObject<Map<number, gsap.core.Timeline>>
  stageDimensions: { width: number; height: number }
  timeline: TimelineData | null
  playbackSpeed?: number
  onAnimationComplete?: (sceneIndex: number) => void
  isPlayingRef?: React.MutableRefObject<boolean> // 재생 중인지 확인용
}

export const usePixiEffects = ({
  appRef,
  containerRef,
  activeAnimationsRef,
  timeline,
  playbackSpeed = 1.0,
  onAnimationComplete,
}: UsePixiEffectsParams) => {
  // 전환 효과 적용
  const applyEnterEffect = useCallback((
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    forceTransition?: string,
    onComplete?: (toText?: PIXI.Text | null) => void,
    _previousIndex?: number | null,
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>,
    sceneId?: number,
    isPlaying?: boolean // 재생 중인지 여부
  ) => {
    if (!toSprite || !appRef.current || !containerRef.current) {
      return
    }
    
    const actualTransition = (forceTransition || transition || 'none').trim().toLowerCase() as TransitionEffect
    const isMovementEffect = sceneId !== undefined && MOVEMENT_EFFECTS.includes(actualTransition)
    const actualDuration = duration
    const isLastInGroup = isMovementEffect && timeline && sceneId !== undefined
      ? !timeline.scenes.some((s, idx) => idx > sceneIndex && s.sceneId === sceneId)
      : true
    void _previousIndex
    
    // transition이 'none'이면 전환 효과가 없으므로 이미지는 렌더링하지 않음 (전환 효과를 통해서만 렌더링)
    if (actualTransition === 'none') {
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
      
      // 전환 효과가 없을 때: 재생 중이면 이미지 숨김, 편집 모드면 이미지 표시
      if (isPlaying) {
        // 재생 중: 전환 효과를 통해서만 렌더링
        toSprite.visible = false
        toSprite.alpha = 0
      } else {
        // 편집 모드: 이미지 표시
        toSprite.visible = true
        toSprite.alpha = 1
      }
      
      // 자막은 항상 표시
      if (toText) {
        toText.visible = true
        toText.alpha = 1
      }
      
      // 렌더링은 PixiJS ticker가 처리
      
      // onComplete 콜백 호출
      if (onComplete) {
        onComplete()
      }
      if (onAnimationComplete) {
        onAnimationComplete(sceneIndex)
      }
      
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
    // 원래 위치 및 스케일 계산 (렌더링되어 있는 스프라이트의 현재 상태를 우선 사용)
    // 편집 모드에서 변경된 위치/스케일을 그대로 활용하여 전환 효과 적용
    let originalX = toSprite.x
    let originalY = toSprite.y
    // 스프라이트의 현재 실제 스케일을 읽어서 사용 (비율 유지)
    const originalScaleX = toSprite.scale.x
    const originalScaleY = toSprite.scale.y
    // 비율을 유지하기 위해 평균값 사용 (또는 더 작은 값 사용)
    const originalScale = originalScaleX // X 스케일을 기준으로 사용 (비율 유지)
    const scaleRatio = originalScaleY / originalScaleX // Y/X 비율 저장
    
    // 타임라인의 transform이 있더라도, 이미 렌더링된 스프라이트의 현재 상태를 우선 사용
    // 단, 스프라이트가 초기 위치(0, 0)에 있고 타임라인에 transform이 있으면 타임라인 값 사용
    // (스프라이트가 아직 제대로 렌더링되지 않은 경우를 대비)
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      // 스프라이트가 초기 상태(0, 0)가 아니거나 이미 렌더링된 상태면 현재 상태 사용
      // 스프라이트가 초기 상태면 타임라인 값 사용
      if (toSprite.x === 0 && toSprite.y === 0 && originalScaleX === 1 && originalScaleY === 1) {
        // 스프라이트가 초기 상태인 경우에만 타임라인 값 사용
        originalX = transform.x
        originalY = transform.y
      }
      // 그 외의 경우는 스프라이트의 현재 상태를 그대로 사용 (편집 모드에서 변경된 상태 유지)
    }


    // 편집 모드면 전환 효과 없이 바로 이미지 표시, 재생 중이면 전환 효과 적용
    if (!isPlaying) {
      // 편집 모드: 즉시 이미지 표시
      toSprite.visible = true
      toSprite.alpha = 1
      if (toText) {
        toText.visible = true
        toText.alpha = 1
      }
      // 편집 모드에서는 전환 효과를 건너뛰고 바로 onComplete 호출
      if (onComplete) {
        onComplete(toText)
      }
      return
    }
    
    // 재생 중: 전환 효과를 보여주려면 이미지가 필요하므로 항상 visible: true로 설정
    // 전환 효과 완료 후에는 항상 숨김 (전환 효과를 통해서만 렌더링)
    toSprite.visible = true
    toSprite.alpha = 0 // 전환 효과 시작 시 alpha: 0
    if (toText) {
      toText.visible = true
      toText.alpha = 1 // 자막은 항상 alpha: 1로 표시 (효과 없음)
    }
    
    // 초기 상태 설정 (렌더링은 PixiJS ticker가 처리)

    // Timeline 생성
    const tl = gsap.timeline({
      timeScale: playbackSpeed,
      onComplete: () => {
        
        // 전환 효과 완료 후 이전 씬 숨기기
        // 이전 씬 인덱스는 updateCurrentScene에서 전달받아야 함
        // 하지만 현재는 직접 접근할 수 없으므로, onComplete 콜백에서 처리하도록 해야 함
        
        // 그룹 재생 중(isPlaying이 true)이면 Timeline을 완료하지 않고 계속 진행
        // duration이 끝나도 전환 효과가 끊어지지 않도록 유지
        // 그룹 재생 중에는 이미지가 사라지지 않도록 onComplete를 실행하지 않음
        const isGroupPlayback = isPlaying
        if (isGroupPlayback) {
          // 그룹 재생 중에는 Timeline을 완료하지 않고 계속 진행
          // activeAnimationsRef에서 삭제하지 않음
          // onComplete 콜백도 호출하지 않음 (그룹 재생이 끝날 때까지 전환 효과와 이미지 유지)
          // 이미지는 전환 효과 중에 보이도록 유지되므로 여기서 숨기지 않음
          return
        }
        
        // 전환 효과 완료 후: 재생 중이면 이미지 숨김, 편집 모드면 이미지 유지
        if (toSprite) {
          if (isPlaying) {
            // 재생 중: 전환 효과를 통해서만 렌더링
            toSprite.visible = false
            toSprite.alpha = 0
          } else {
            // 편집 모드: 이미지 유지
            toSprite.visible = true
            toSprite.alpha = 1
          }
        }
        
        // 자막은 항상 alpha: 1로 표시 (효과 없음)
        if (toText) {
          toText.visible = true
          toText.alpha = 1
        }
        // 렌더링은 PixiJS ticker가 처리
        
        // "움직임" 효과이고 그룹의 마지막 씬이 아닌 경우
        // Timeline을 완료하지 않고 계속 진행 (재생 중이든 아니든 상관없이)
        const isLongDuration = isPlaying && duration >= 3.0 // 긴 duration으로 간주
        if (isMovementEffect && !isLastInGroup && !isLongDuration) {
          // Timeline을 완료하지 않고 계속 진행
          // activeAnimationsRef에서 삭제하지 않음
          // onComplete 콜백도 호출하지 않음 (자막 변경만 처리)
          // 재생 중에는 시간 기반으로 씬이 변경되므로 onComplete는 재생 로직에서 처리
          return
        }
        
        activeAnimationsRef.current.delete(sceneIndex)
        
        if (onComplete) {
          onComplete(toText)
        }
        
        // 기존 onAnimationComplete도 호출 (다른 용도로 사용될 수 있음)
        if (onAnimationComplete) {
          onAnimationComplete(sceneIndex)
        }
      }
    })
    // Timeline을 즉시 activeAnimationsRef에 추가하여 updateCurrentScene(true)가 호출되어도 전환 효과를 건너뛰지 않도록 함
    activeAnimationsRef.current.set(sceneIndex, tl)
    
    // "움직임" 효과인 경우 그룹별 Timeline 추적에 저장
    if (groupTransitionTimelinesRef && sceneId !== undefined && MOVEMENT_EFFECTS.includes(actualTransition)) {
      groupTransitionTimelinesRef.current.set(sceneId, tl)
    }
    
    // 텍스트는 효과 없이 항상 alpha: 1로 표시
    const applyTextFade = () => {
      if (!toText) return
      // 자막은 항상 alpha: 1로 표시 (효과 없음)
      toText.alpha = 1
      toText.visible = true
      if (toText.mask) {
        toText.mask = null
      }
    }
    
    // 전환 효과별 처리 (이미지만 적용, 텍스트는 항상 페이드)
    const transitionParams: TransitionParams = {
      toSprite,
      toText,
      containerRef,
      originalX,
      originalY,
      originalScale,
      originalScaleX,
      originalScaleY,
      scaleRatio,
      stageWidth,
      stageHeight,
      duration: actualDuration,
      timeline: tl,
    }

    switch (actualTransition) {
      case 'fade':
        applyFadeTransition(transitionParams)
        break

      case 'slide-left':
        applySlideTransition(transitionParams, 'left')
        break

      case 'slide-right':
        applySlideTransition(transitionParams, 'right')
        break

      case 'slide-up':
        applySlideTransition(transitionParams, 'up')
        break

      case 'slide-down':
        applySlideTransition(transitionParams, 'down')
        break

      case 'zoom-in':
        applyZoomTransition(transitionParams, 'in')
        break

      case 'zoom-out':
        applyZoomTransition(transitionParams, 'out')
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
                // 자막은 항상 alpha: 1로 표시 (효과 없음)
                toText.alpha = 1
                toText.visible = true
              }
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
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
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
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
                // 렌더링은 PixiJS ticker가 처리
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
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'ripple':
        {
          // 물결 효과: 현재 크기에서 물결 파동이 퍼지는 효과 (비율 유지)
          const toRippleObj = { scale: originalScale, alpha: 0, wavePhase: 0 }
          // 현재 스케일에서 시작 (비율 유지)
          toSprite.scale.set(originalScaleX, originalScaleY)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          // 중심점 계산 (스프라이트의 현재 중심)
          const centerX = originalX + (toSprite.texture.width * originalScaleX) / 2
          const centerY = originalY + (toSprite.texture.height * originalScaleY) / 2
          
          // 페이드 인
          tl.to(toRippleObj, { 
            alpha: 1, 
            duration: duration * 0.15, 
            ease: 'power1.out',
            onUpdate: function() {
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                toSprite.alpha = toRippleObj.alpha
              }
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            }
          }, 0)
          
          // 물결 효과: 현재 크기 주변에서 파동이 퍼지는 효과
          const waveCount = 2 // 물결 파동 개수
          const waveDuration = duration * 0.85 / waveCount
          
          for (let i = 0; i < waveCount; i++) {
            const waveStartTime = duration * 0.15 + (waveDuration * i)
            const waveObj = { scale: originalScale, waveIntensity: 0 }
            
            // 각 파동이 시작될 때 (현재 스케일에서 시작)
            tl.set(waveObj, { scale: originalScale, waveIntensity: 0 }, waveStartTime)
            
            // 파동이 퍼지는 애니메이션 (현재 크기에서 약간 커졌다가)
            tl.to(waveObj, {
              scale: originalScale * 1.06, // 현재 크기에서 약간만 커짐
              waveIntensity: 1,
              duration: waveDuration * 0.5,
              ease: 'sine.out',
              onUpdate: function() {
                if (toSprite && containerRef.current) {
                  // 물결 효과를 위한 스케일 변동 (현재 크기 기준으로 파동, 비율 유지)
                  const baseScale = originalScale + (waveObj.scale - originalScale) * waveObj.waveIntensity
                  const waveScale = baseScale + (waveObj.waveIntensity * originalScale * 0.02 * Math.sin(waveObj.waveIntensity * Math.PI * 3))
                  toSprite.scale.set(waveScale, waveScale * scaleRatio)
                  
                  // 중심점 기준으로 위치 조정 (중심점 유지)
                  const newWidth = toSprite.texture.width * waveScale
                  const newHeight = toSprite.texture.height * waveScale * scaleRatio
                  toSprite.x = centerX - newWidth / 2
                  toSprite.y = centerY - newHeight / 2
                }
                // 렌더링은 PixiJS ticker가 처리
              }
            }, waveStartTime)
            
            // 파동이 현재 크기로 돌아오는 애니메이션
            tl.to(waveObj, {
              scale: originalScale, // 현재 크기로 돌아옴
              waveIntensity: 0,
              duration: waveDuration * 0.5,
              ease: 'sine.in',
              onUpdate: function() {
                if (toSprite && containerRef.current) {
                  const baseScale = originalScale + (waveObj.scale - originalScale) * waveObj.waveIntensity
                  const waveScale = baseScale + (waveObj.waveIntensity * originalScale * 0.02 * Math.sin(waveObj.waveIntensity * Math.PI * 3))
                  toSprite.scale.set(waveScale, waveScale * scaleRatio)
                  
                  // 중심점 기준으로 위치 조정 (중심점 유지)
                  const newWidth = toSprite.texture.width * waveScale
                  const newHeight = toSprite.texture.height * waveScale * scaleRatio
                  toSprite.x = centerX - newWidth / 2
                  toSprite.y = centerY - newHeight / 2
                }
                // 렌더링은 PixiJS ticker가 처리
              }
            }, waveStartTime + waveDuration * 0.5)
          }
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'circle':
        {
          // 원형 마스크 확장 (중앙에서 원형으로 확장) - 이미지만 적용
          // circle 케이스는 alpha: 1로 설정해야 함 (마스크로 보이기 때문)
          const circleMask = new PIXI.Graphics()
          circleMask.fill({ color: 0xffffff })
          circleMask.circle(stageWidth / 2, stageHeight / 2, 0)
          
          // 마스크를 컨테이너에 추가 (마스크가 표시되려면 컨테이너에 있어야 함)
          if (containerRef.current) {
            containerRef.current.addChild(circleMask)
          }
          
          toSprite.mask = circleMask
          toSprite.alpha = 1
          // visible은 이미 위에서 설정됨
          
          const maskRadius = { value: 0 }
          const maxRadius = Math.sqrt(stageWidth * stageWidth + stageHeight * stageHeight) / 2
          
          tl.to(maskRadius, { 
            value: maxRadius,
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
              }
              
              // 마스크가 컨테이너에 있는지 확인하고 없으면 추가
              if (circleMask && containerRef.current) {
                if (!circleMask.parent || circleMask.parent !== containerRef.current) {
                  if (circleMask.parent) {
                    circleMask.parent.removeChild(circleMask)
                  }
                  containerRef.current.addChild(circleMask)
                }
              }
              
              circleMask.clear()
              circleMask.fill({ color: 0xffffff })
              circleMask.circle(stageWidth / 2, stageHeight / 2, maskRadius.value)
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
              }
              
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: function() {
              // 전환 효과 완료 후 마스크 정리 (선택사항)
              // 마스크는 유지해도 되지만, 필요하면 제거할 수 있음
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
                toText.alpha = 1 // 자막은 항상 alpha: 1로 표시 (효과 없음)
              }
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            }
          }, 0)
        }
    }

    // 이전 코드 패턴: 애니메이션 완료 후 정리
    tl.call(() => {
      activeAnimationsRef.current.delete(sceneIndex)
      // 렌더링은 PixiJS ticker가 처리
    })

    // 이전 코드 패턴: Timeline은 자동으로 시작됨 (기본값이 paused: false)
    // 하지만 명시적으로 시작을 보장하기 위해 requestAnimationFrame에서 확인
    requestAnimationFrame(() => {
      // Timeline이 실제로 시작되었는지 확인하고, 시작되지 않았으면 시작
      if (tl && tl.paused()) {
        tl.play()
      }
      
      // 초기 상태 설정 (렌더링은 PixiJS ticker가 처리)
    })
  }, [appRef, containerRef, activeAnimationsRef, timeline, playbackSpeed, onAnimationComplete])

  return {
    applyEnterEffect,
  }
}
