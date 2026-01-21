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
    
    // transition이 'none'이면 전환 효과 없이 즉시 표시
    if (actualTransition === 'none') {
      // 컨테이너에 추가
      if (toSprite.parent !== containerRef.current) {
        if (toSprite.parent) {
          toSprite.parent.removeChild(toSprite)
        }
        containerRef.current.addChild(toSprite)
        // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
        containerRef.current.setChildIndex(toSprite, 0)
      }
      // 텍스트 처리: 씬이 넘어가지 않았다면 자막 렌더링 유지
      if (toText) {
        // 씬이 넘어갔는지 확인 (_previousIndex가 null이거나 현재 sceneIndex와 같으면 넘어가지 않음)
        const isSceneChanged = _previousIndex !== null && _previousIndex !== sceneIndex
        
        if (isSceneChanged) {
          // 씬이 넘어갔으면 텍스트 렌더링
          if (toText.parent !== containerRef.current) {
            if (toText.parent) {
              toText.parent.removeChild(toText)
            }
            containerRef.current.addChild(toText)
          }
          
          toText.visible = true
          toText.alpha = 1
          
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          if (containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(toText, maxIndex)
            }
          }
        } else {
          // 씬이 넘어가지 않았으면 텍스트를 그대로 유지하되, 맨 위에 있는지 확인
          if (toText.parent === containerRef.current && containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(toText, maxIndex)
            }
          }
        }
      }
      
      // 전환 효과가 없을 때: 재생 중이든 편집 모드든 이미지 표시
        toSprite.visible = true
        toSprite.alpha = 1
      
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

    // 컨테이너에 추가 (텍스트가 항상 위에 오도록 순서 보장)
    if (toSprite.parent !== containerRef.current) {
      if (toSprite.parent) {
      toSprite.parent.removeChild(toSprite)
    }
      containerRef.current.addChild(toSprite)
      // 이미지가 추가된 후 자막을 맨 위로 올림
      if (toText && containerRef.current) {
        const textIndex = containerRef.current.getChildIndex(toText)
        const maxIndex = containerRef.current.children.length - 1
        if (textIndex !== maxIndex) {
          containerRef.current.setChildIndex(toText, maxIndex)
        }
      }
    }
    
    // 텍스트 처리: 씬이 넘어가지 않았다면 자막 렌더링 유지
    if (toText) {
      // 씬이 넘어갔는지 확인 (_previousIndex가 null이거나 현재 sceneIndex와 같으면 넘어가지 않음)
      const isSceneChanged = _previousIndex !== null && _previousIndex !== sceneIndex
      
      if (isSceneChanged) {
        // 씬이 넘어갔으면 텍스트 렌더링
        if (toText.parent !== containerRef.current) {
          if (toText.parent) {
            toText.parent.removeChild(toText)
          }
          containerRef.current.addChild(toText)
        }
        
        toText.visible = true
        toText.alpha = 1
        
        // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
        if (containerRef.current) {
          const currentIndex = containerRef.current.getChildIndex(toText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(toText, maxIndex)
          }
        }
      } else {
        // 씬이 넘어가지 않았으면 텍스트를 그대로 유지하되, 맨 위에 있는지 확인
        if (toText && containerRef.current && toText.parent === containerRef.current) {
          const currentIndex = containerRef.current.getChildIndex(toText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(toText, maxIndex)
          }
        }
      }
    }
    // 원래 위치 및 스케일 계산
    // anchor가 (0.5, 0.5)이므로 항상 타임라인의 transform을 중심점 기준으로 변환하여 사용
    let originalX: number
    let originalY: number
    const originalScaleX = toSprite.scale.x
    const originalScaleY = toSprite.scale.y
    const originalScale = originalScaleX // X 스케일을 기준으로 사용 (비율 유지)
    const scaleRatio = originalScaleY / originalScaleX // Y/X 비율 저장
    
    // 타임라인의 transform을 기준으로 원래 위치 계산 (anchor 0.5, 0.5 기준)
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      // anchor가 (0.5, 0.5)이므로 타임라인의 좌상단 기준 좌표를 중심점 기준으로 변환
      originalX = transform.x + transform.width * 0.5
      originalY = transform.y + transform.height * 0.5
    } else {
      // Transform이 없으면 기본 위치 사용 (anchor 0.5, 0.5 기준)
      const imageY = stageHeight * 0.15
      originalX = stageWidth * 0.5
      originalY = imageY + (stageHeight * 0.7) * 0.5
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
      // 편집 모드에서도 텍스트를 항상 보이게 함
      if (toText && containerRef.current) {
        if (toText.parent !== containerRef.current) {
          if (toText.parent) {
            toText.parent.removeChild(toText)
          }
          containerRef.current.addChild(toText)
        }
        toText.visible = true
        toText.alpha = 1
        const currentIndex = containerRef.current.getChildIndex(toText)
        const maxIndex = containerRef.current.children.length - 1
        if (currentIndex !== maxIndex) {
          containerRef.current.setChildIndex(toText, maxIndex)
        }
        if (toText.mask) {
          toText.mask = null
        }
      }
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
        // 전환 효과 완료 후: 이미지가 이미 보이는 상태라면 그대로 유지 (깜빡임 방지)
        // 씬이 넘어가지 않는다면 이미지가 그대로 남아있어야 함
        if (toSprite) {
          // 컨테이너에 없으면 추가 (필요한 경우에만)
          if (containerRef.current && toSprite.parent !== containerRef.current) {
            if (toSprite.parent) {
              toSprite.parent.removeChild(toSprite)
            }
            containerRef.current.addChild(toSprite)
          }
          
          // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
          if (containerRef.current && toSprite.parent === containerRef.current) {
            containerRef.current.setChildIndex(toSprite, 0)
          }
          
          // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
          // 보이지 않는 경우에만 보이게 설정
          if (!toSprite.visible || toSprite.alpha < 1) {
            toSprite.visible = true
            toSprite.alpha = 1
          }
          
          // 필터 제거 (블러 등) - 항상 제거
          if (toSprite.filters && toSprite.filters.length > 0) {
            toSprite.filters = []
          }
          // 마스크 제거 (원형 등) - 항상 제거
          if (toSprite.mask) {
            toSprite.mask = null
          }
        }
        
        // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
        if (toText) {
          // 컨테이너에 없으면 추가
          if (containerRef.current && toText.parent !== containerRef.current) {
            if (toText.parent) {
              toText.parent.removeChild(toText)
            }
            containerRef.current.addChild(toText)
          }
          
          // 항상 보이게 설정
          toText.visible = true
          toText.alpha = 1
          
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          if (containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(toText, maxIndex)
            }
          }
          
          // 마스크 제거 (원형 등) - 마스크가 있을 때만 제거
          if (toText.mask) {
            toText.mask = null
          }
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
        
        // 전환 효과 완료 후 텍스트를 항상 보이게 함 (메인 타임라인 완료 시)
        if (toText && containerRef.current) {
          if (toText.parent !== containerRef.current) {
            if (toText.parent) {
              toText.parent.removeChild(toText)
            }
            containerRef.current.addChild(toText)
          }
          toText.visible = true
          toText.alpha = 1
          const currentIndex = containerRef.current.getChildIndex(toText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(toText, maxIndex)
          }
          if (toText.mask) {
            toText.mask = null
          }
        }
        
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
          // 회전 (회전하며 나타남) - 이미지만 적용
          const toRotateObj = { rotation: -Math.PI * 2 }
          toSprite.rotation = -Math.PI * 2
          toSprite.alpha = 1 // 이미지 페이드 제거
          
          tl.to(toRotateObj, { 
            rotation: 0, 
            duration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                  // 이미지가 추가된 후 자막을 맨 위로 올림
                  if (toText && containerRef.current) {
                    const textIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (textIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
                  }
                }
                toSprite.rotation = toRotateObj.rotation
                toSprite.alpha = 1
              }
              // 텍스트 처리: 씬이 넘어가지 않았다면 자막 렌더링 유지
              if (toText && containerRef.current) {
                // 씬이 넘어갔는지 확인 (_previousIndex가 null이거나 현재 sceneIndex와 같으면 넘어가지 않음)
                const isSceneChanged = _previousIndex !== null && _previousIndex !== sceneIndex
                
                if (isSceneChanged) {
                  // 씬이 넘어갔으면 텍스트 렌더링
                  if (toText.parent !== containerRef.current) {
                    if (toText.parent) {
                      toText.parent.removeChild(toText)
                    }
                    containerRef.current.addChild(toText)
                  }
                  
                  toText.visible = true
                  toText.alpha = 1
                  
                  // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
                  const currentIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (currentIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
                } else {
                  // 씬이 넘어가지 않았으면 텍스트를 그대로 유지하되, 맨 위에 있는지 확인
                  if (toText.parent === containerRef.current) {
                    const currentIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (currentIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
                  }
                }
              }
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: () => {
              // 회전 효과 완료 후 스프라이트가 확실히 보이도록 보장
              if (toSprite && containerRef.current) {
                if (toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
                if (toSprite.parent === containerRef.current) {
                  containerRef.current.setChildIndex(toSprite, 0)
                }
                // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
                if (!toSprite.visible || toSprite.alpha < 1) {
                  toSprite.visible = true
                  toSprite.alpha = 1
                }
                toSprite.rotation = 0
              }
              
              // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
              if (toText && containerRef.current) {
                if (toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                toText.visible = true
                toText.alpha = 1
                const currentIndex = containerRef.current.getChildIndex(toText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(toText, maxIndex)
                }
                if (toText.mask) {
                  toText.mask = null
                }
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      case 'blur':
        {
          // 블러 (블러에서 선명하게) - 이미지만 적용
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
                  // 이미지가 추가된 후 자막을 맨 위로 올림
                  if (toText && containerRef.current) {
                    const textIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (textIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
                  }
                }
                toBlurFilter.blur = toBlurObj.blur
                toSprite.alpha = toBlurObj.alpha
              }
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: () => {
              // 블러 효과 완료 후 필터 제거 및 스프라이트 보이도록 보장
              if (toSprite) {
                toSprite.filters = []
                // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
                if (!toSprite.visible || toSprite.alpha < 1) {
                  toSprite.visible = true
                  toSprite.alpha = 1
                }
                // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
                if (containerRef.current && toSprite.parent === containerRef.current) {
                  containerRef.current.setChildIndex(toSprite, 0)
                }
              }
              
              // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
              if (toText && containerRef.current) {
                if (toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                toText.visible = true
                toText.alpha = 1
                const currentIndex = containerRef.current.getChildIndex(toText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(toText, maxIndex)
                }
                if (toText.mask) {
                  toText.mask = null
                }
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
          const glitchObj = { x: originalX }
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
          
          // 글리치 이동만 적용, 페이드는 제거 (이미지는 즉시 보이도록 alpha=1 고정)
          tl.set(toSprite, { alpha: 1 }, 0)
          tl.set(glitchObj, { x: originalX }, 0)
          tl.set(toText, {}, 0) // 텍스트는 별도 페이드 적용

          tl.to(glitchObj, { 
            duration, 
            onUpdate: function() {
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                  // 이미지가 추가된 후 자막을 맨 위로 올림
                  if (toText && containerRef.current) {
                    const textIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (textIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
                  }
                }
                toSprite.x = glitchObj.x
              }
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
            },
            onComplete: () => {
              // 글리치 효과 완료 후 스프라이트가 확실히 보이도록 보장
              if (toSprite && containerRef.current) {
                if (toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
                if (toSprite.parent === containerRef.current) {
                  containerRef.current.setChildIndex(toSprite, 0)
                }
                // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
                if (!toSprite.visible || toSprite.alpha < 1) {
                  toSprite.visible = true
                  toSprite.alpha = 1
                }
                toSprite.x = originalX // 원래 위치로 복원
              }
              
              // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
              if (toText && containerRef.current) {
                if (toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                toText.visible = true
                toText.alpha = 1
                const currentIndex = containerRef.current.getChildIndex(toText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(toText, maxIndex)
                }
                if (toText.mask) {
                  toText.mask = null
                }
              }
            }
          }, 0)
          
          // 텍스트는 항상 페이드
          applyTextFade()
        }
        break

      // case 'ripple':
      //   {
      //     // 물결 효과: 현재 크기에서 물결 파동이 퍼지는 효과 (비율 유지)
      //     const toRippleObj = { scale: originalScale, alpha: 0, wavePhase: 0 }
      //     // 현재 스케일에서 시작 (비율 유지)
      //     toSprite.scale.set(originalScaleX, originalScaleY)
      //     // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
      //     
      //     // 중심점 계산 (스프라이트의 현재 중심)
      //     const centerX = originalX + (toSprite.texture.width * originalScaleX) / 2
      //     const centerY = originalY + (toSprite.texture.height * originalScaleY) / 2
      //     
      //     // 페이드 인
      //     tl.to(toRippleObj, { 
      //       alpha: 1, 
      //       duration: duration * 0.15, 
      //       ease: 'power1.out',
      //       onUpdate: function() {
      //         if (toSprite && containerRef.current) {
      //           if (!toSprite.parent || toSprite.parent !== containerRef.current) {
      //             if (toSprite.parent) {
      //               toSprite.parent.removeChild(toSprite)
      //             }
      //             containerRef.current.addChild(toSprite)
      //           }
      //           toSprite.alpha = toRippleObj.alpha
      //         }
      //         // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
      //       }
      //     }, 0)
      //     
      //     // 물결 효과: 현재 크기 주변에서 파동이 퍼지는 효과
      //     const waveCount = 2 // 물결 파동 개수
      //     const waveDuration = duration * 0.85 / waveCount
      //     
      //     for (let i = 0; i < waveCount; i++) {
      //       const waveStartTime = duration * 0.15 + (waveDuration * i)
      //       const waveObj = { scale: originalScale, waveIntensity: 0 }
      //       
      //       // 각 파동이 시작될 때 (현재 스케일에서 시작)
      //       tl.set(waveObj, { scale: originalScale, waveIntensity: 0 }, waveStartTime)
      //       
      //       // 파동이 퍼지는 애니메이션 (현재 크기에서 약간 커졌다가)
      //       tl.to(waveObj, {
      //         scale: originalScale * 1.06, // 현재 크기에서 약간만 커짐
      //         waveIntensity: 1,
      //         duration: waveDuration * 0.5,
      //         ease: 'sine.out',
      //         onUpdate: function() {
      //           if (toSprite && containerRef.current) {
      //             // 물결 효과를 위한 스케일 변동 (현재 크기 기준으로 파동, 비율 유지)
      //             const baseScale = originalScale + (waveObj.scale - originalScale) * waveObj.waveIntensity
      //             const waveScale = baseScale + (waveObj.waveIntensity * originalScale * 0.02 * Math.sin(waveObj.waveIntensity * Math.PI * 3))
      //             toSprite.scale.set(waveScale, waveScale * scaleRatio)
      //             
      //             // 중심점 기준으로 위치 조정 (중심점 유지)
      //             const newWidth = toSprite.texture.width * waveScale
      //             const newHeight = toSprite.texture.height * waveScale * scaleRatio
      //             toSprite.x = centerX - newWidth / 2
      //             toSprite.y = centerY - newHeight / 2
      //           }
      //           // 렌더링은 PixiJS ticker가 처리
      //         }
      //       }, waveStartTime)
      //       
      //       // 파동이 현재 크기로 돌아오는 애니메이션
      //       tl.to(waveObj, {
      //         scale: originalScale, // 현재 크기로 돌아옴
      //         waveIntensity: 0,
      //         duration: waveDuration * 0.5,
      //         ease: 'sine.in',
      //         onUpdate: function() {
      //           if (toSprite && containerRef.current) {
      //             const baseScale = originalScale + (waveObj.scale - originalScale) * waveObj.waveIntensity
      //             const waveScale = baseScale + (waveObj.waveIntensity * originalScale * 0.02 * Math.sin(waveObj.waveIntensity * Math.PI * 3))
      //             toSprite.scale.set(waveScale, waveScale * scaleRatio)
      //             
      //             // 중심점 기준으로 위치 조정 (중심점 유지)
      //             const newWidth = toSprite.texture.width * waveScale
      //             const newHeight = toSprite.texture.height * waveScale * scaleRatio
      //             toSprite.x = centerX - newWidth / 2
      //             toSprite.y = centerY - newHeight / 2
      //           }
      //           // 렌더링은 PixiJS ticker가 처리
      //         }
      //       }, waveStartTime + waveDuration * 0.5)
      //     }
      //     
      //     // 텍스트는 항상 페이드
      //     applyTextFade()
      //   }
      //   break

      case 'circle': {
        if (!containerRef.current || !toSprite) {
          break
        }

        // 스프라이트 기준 원형 마스크 확장 (스프라이트 중심을 피벗으로 사용)
        const mask = new PIXI.Graphics()
        // originalX/Y는 스프라이트의 현재 위치(중심)를 의미하도록 로딩/렌더러에서 anchor 0.5로 맞춰둠
        const centerX = toSprite.x
        const centerY = toSprite.y
        const maxRadius = Math.sqrt(
          Math.pow((toSprite.texture.width * originalScaleX) / 2, 2) +
          Math.pow((toSprite.texture.height * originalScaleY) / 2, 2)
        )

        const state = { r: 0 }
        const drawMask = () => {
          mask.clear()
          mask.beginFill(0xffffff)
          mask.drawCircle(centerX, centerY, state.r)
          mask.endFill()
        }

        drawMask()
        containerRef.current.addChild(mask)
        toSprite.mask = mask
        // 자막은 마스크를 적용하지 않아 영역 왜곡을 방지
        toSprite.alpha = 1

        tl.to(state, {
          r: maxRadius,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            drawMask()
            if (containerRef.current && !containerRef.current.children.includes(mask)) {
              containerRef.current.addChild(mask)
            }
          },
          onComplete: () => {
            // 원형 마스크 제거 후 스프라이트가 확실히 보이도록 보장
            toSprite.mask = null
            if (mask.parent) mask.parent.removeChild(mask)
            mask.destroy()
            // 마스크 제거 후에도 스프라이트가 보이도록 보장
            if (toSprite && containerRef.current) {
              if (toSprite.parent !== containerRef.current) {
                if (toSprite.parent) {
                  toSprite.parent.removeChild(toSprite)
                }
                containerRef.current.addChild(toSprite)
              }
              // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
              if (toSprite.parent === containerRef.current) {
                containerRef.current.setChildIndex(toSprite, 0)
              }
              // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
              if (!toSprite.visible || toSprite.alpha < 1) {
                toSprite.visible = true
                toSprite.alpha = 1
              }
            }
            
            // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
            if (toText && containerRef.current) {
              if (toText.parent !== containerRef.current) {
                if (toText.parent) {
                  toText.parent.removeChild(toText)
                }
                containerRef.current.addChild(toText)
              }
              toText.visible = true
              toText.alpha = 1
              const currentIndex = containerRef.current.getChildIndex(toText)
              const maxIndex = containerRef.current.children.length - 1
              if (currentIndex !== maxIndex) {
                containerRef.current.setChildIndex(toText, maxIndex)
              }
              if (toText.mask) {
                toText.mask = null
              }
            }
          },
        }, 0)

        applyTextFade()
      }
      break

      default:
        // 기본 페이드 효과
        {
          const defaultFadeObj = { alpha: 0 }
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          // 텍스트도 이미 위에서 설정됨
          
          tl.to(defaultFadeObj, { 
            alpha: 1, 
            duration, 
            onUpdate: function() {
              if (toSprite && containerRef.current) {
                if (toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                  // 이미지가 추가된 후 자막을 맨 위로 올림
                  if (toText && containerRef.current) {
                    const textIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (textIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
                  }
                }
                toSprite.alpha = defaultFadeObj.alpha
              }
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: () => {
              // 페이드 효과 완료 후 스프라이트가 확실히 보이도록 보장
              if (toSprite && containerRef.current) {
                if (toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
                if (toSprite.parent === containerRef.current) {
                  containerRef.current.setChildIndex(toSprite, 0)
                }
                // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
                if (!toSprite.visible || toSprite.alpha < 1) {
                  toSprite.visible = true
                  toSprite.alpha = 1
                }
              }
              
              // 텍스트 처리: 전환 효과 완료 후 항상 텍스트를 보이게 함
              if (toText && containerRef.current) {
                if (toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                toText.visible = true
                toText.alpha = 1
                const currentIndex = containerRef.current.getChildIndex(toText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(toText, maxIndex)
                }
                if (toText.mask) {
                  toText.mask = null
                }
              }
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
