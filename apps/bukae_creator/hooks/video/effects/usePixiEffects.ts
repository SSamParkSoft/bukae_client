import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import { applyFadeTransition } from './transitions/fade'
import { applySlideTransition } from './transitions/slide'
import { applyZoomTransition } from './transitions/zoom'
import type { TransitionParams } from './utils'
import { MOVEMENT_EFFECTS, type TransitionEffect } from '../types/effects'

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
    isPlaying?: boolean, // 재생 중인지 여부
    fromSprite?: PIXI.Sprite | null // 이전 씬의 스프라이트 (페이드 아웃용)
  ) => {
    if (!toSprite || toSprite.destroyed || !appRef.current || !containerRef.current) {
      return
    }
    
    // transition과 forceTransition이 문자열인지 확인하고 안전하게 처리
    const transitionStr = typeof (forceTransition || transition) === 'string' 
      ? (forceTransition || transition || 'none')
      : 'none'
    const actualTransition = (typeof transitionStr === 'string' && transitionStr && typeof transitionStr.trim === 'function' ? transitionStr.trim() : 'none').toLowerCase() as TransitionEffect
    const isMovementEffect = sceneId !== undefined && MOVEMENT_EFFECTS.includes(actualTransition)
    const actualDuration = duration
    const isLastInGroup = isMovementEffect && timeline && sceneId !== undefined
      ? !timeline.scenes.some((s, idx) => idx > sceneIndex && s.sceneId === sceneId)
      : true
    void _previousIndex
    
    // transition이 'none'이면 전환 효과 없이 GSAP timeline 생성 (Transport 기반 렌더링을 위해)
    // 편집 모드가 아닐 때(isPlaying === true)는 timeline을 생성하여 어댑터로 관리
    // 편집 모드일 때(isPlaying === false)는 기존처럼 즉시 표시
    if (actualTransition === 'none') {
      // 스프라이트가 여전히 유효한지 확인
      if (toSprite.destroyed || !containerRef.current) {
        return
      }
      
      // 편집 모드가 아닐 때(isPlaying === true)는 GSAP timeline 생성
      if (isPlaying) {
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
          // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
          containerRef.current.setChildIndex(toSprite, 0)
        }
        
        // 텍스트 처리
        if (toText) {
          const isSceneChanged = _previousIndex !== null && _previousIndex !== sceneIndex
          
          if (isSceneChanged) {
            if (toText.parent !== containerRef.current) {
              if (toText.parent) {
                toText.parent.removeChild(toText)
              }
              containerRef.current.addChild(toText)
            }
            
            toText.visible = true
            toText.alpha = 1
            
            if (toText && containerRef.current && toText.parent === containerRef.current) {
              const currentIndex = containerRef.current.getChildIndex(toText)
              const maxIndex = containerRef.current.children.length - 1
              if (currentIndex !== maxIndex) {
                containerRef.current.setChildIndex(toText, maxIndex)
              }
            }
          } else {
            if (toText.parent === containerRef.current && containerRef.current) {
              const currentIndex = containerRef.current.getChildIndex(toText)
              const maxIndex = containerRef.current.children.length - 1
              if (currentIndex !== maxIndex) {
                containerRef.current.setChildIndex(toText, maxIndex)
              }
            }
          }
        }
        
        // GSAP timeline 생성 (전환효과 없음: alpha를 0에서 1로 즉시 설정)
        const tl = gsap.timeline({ paused: true })
        
        // 기본적으로 alpha를 0으로 시작
        toSprite.visible = true
        toSprite.alpha = 0
        
        // 전환효과가 없을 때는 alpha를 1로 즉시 설정 (duration 0)
        tl.to(toSprite, {
          alpha: 1,
          duration: 0, // 즉시 설정
          ease: 'none',
        })
        
        // 이후 alpha를 1로 유지 (전환효과가 없으므로)
        tl.to(toSprite, {
          alpha: 1,
          duration: actualDuration || 1,
          ease: 'none',
        })
        
        // timeline을 activeAnimationsRef에 저장
        activeAnimationsRef.current.set(sceneIndex, tl)
        
        // onComplete 콜백 호출
        if (onComplete) {
          onComplete(toText)
        }
        if (onAnimationComplete) {
          onAnimationComplete(sceneIndex)
        }
        
        return
      }
      
      // 편집 모드일 때는 기존 로직 (즉시 표시)
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
          if (toText && containerRef.current && toText.parent === containerRef.current) {
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
      if (toText && containerRef.current && toText.parent === containerRef.current) {
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
      
      // 슬라이드 좌 효과일 때는 이전 씬의 텍스트가 남아있을 수 있으므로 명시적으로 정리
      // 슬라이드 좌는 오른쪽에서 시작하므로 이전 씬의 텍스트가 보일 수 있음
      if (actualTransition === 'slide-left' && isSceneChanged && containerRef.current) {
        // 컨테이너의 모든 텍스트 객체 확인 및 현재 씬의 텍스트가 아닌 것들 제거
        const container = containerRef.current
        const containerChildren = Array.from(container.children)
        containerChildren.forEach((child) => {
          if (child instanceof PIXI.Text && child !== toText) {
            // 현재 씬의 텍스트가 아니면 컨테이너에서 제거하고 숨김
            container.removeChild(child)
            child.visible = false
            child.alpha = 0
          }
        })
      }
      
      if (isSceneChanged) {
        // 씬이 넘어갔으면 텍스트 렌더링
        // 슬라이드 좌 효과일 때는 자막이 이미 컨테이너에 있으면 제거/재추가를 하지 않음
        // 이렇게 하면 자막의 원래 렌더링(transform, 스타일, 텍스트)이 유지됨
        if (actualTransition === 'slide-left' && toText && toText.parent === containerRef.current) {
          // 이미 컨테이너에 있으면 제거/재추가를 하지 않고 그대로 유지
          // 단, visible과 alpha만 업데이트
          // 자막의 wordWrapWidth가 0.9로 변경되지 않도록 현재 스타일 유지
          toText.visible = true
          toText.alpha = 1
          
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          const currentIndex = containerRef.current.getChildIndex(toText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(toText, maxIndex)
          }
        } else {
          // 슬라이드 좌가 아니거나 컨테이너에 없으면 기존 로직 사용
          if (toText.parent !== containerRef.current) {
            if (toText.parent) {
              toText.parent.removeChild(toText)
            }
            containerRef.current.addChild(toText)
          }
          
          // 슬라이드 좌 효과일 때 자막 스타일이 다시 적용되면서 wordWrapWidth가 변경되지 않도록
          // timeline의 transform.width를 사용하여 정확한 너비 유지
          if (actualTransition === 'slide-left' && toText && timeline?.scenes[sceneIndex]?.text) {
            const scene = timeline.scenes[sceneIndex]
            const stageWidth = appRef.current?.screen?.width || 1080
            let textWidth = stageWidth
            if (scene.text?.transform?.width) {
              textWidth = scene.text.transform.width / (scene.text.transform.scaleX || 1)
            }
            
            // 현재 스타일의 wordWrapWidth가 올바른지 확인하고 필요시 업데이트
            if (toText.style && toText.style.wordWrapWidth !== textWidth) {
              toText.style.wordWrapWidth = textWidth
              // 스타일 변경을 적용하기 위해 텍스트를 다시 설정
              toText.text = toText.text
            }
          }
          
          toText.visible = true
          toText.alpha = 1
          
          // 텍스트를 맨 위로 올림 (자막이 이미지 위에 보이도록)
          if (toText && containerRef.current && toText.parent === containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(toText, maxIndex)
            }
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
    // 편집 모드에서 사용자가 설정한 위치를 원래 위치로 사용
    // 타임라인의 transform에 저장된 x, y는 이미 anchor (0.5, 0.5) 기준의 중심점 좌표
    let originalX: number
    let originalY: number
    
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      // 편집 모드에서 저장된 위치를 그대로 사용 (이미 중심점 좌표)
      originalX = transform.x
      originalY = transform.y
    } else {
      // Transform이 없으면 기본 위치 사용 (anchor 0.5, 0.5 기준)
      const imageY = stageHeight * 0.15
      originalX = stageWidth * 0.5
      originalY = imageY + (stageHeight * 0.7) * 0.5
    }
    // toSprite가 null이거나 destroyed된 경우 조기 종료
    if (!toSprite || toSprite.destroyed) {
      if (onComplete) {
        onComplete(toText)
      }
      return
    }

    const originalScaleX = toSprite.scale.x
    const originalScaleY = toSprite.scale.y
    const originalScale = originalScaleX // X 스케일을 기준으로 사용 (비율 유지)
    const scaleRatio = originalScaleY / originalScaleX // Y/X 비율 저장


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
        if (toText.parent === containerRef.current && containerRef.current) {
          const currentIndex = containerRef.current.getChildIndex(toText)
          const maxIndex = containerRef.current.children.length - 1
          if (currentIndex !== maxIndex) {
            containerRef.current.setChildIndex(toText, maxIndex)
          }
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
    // 블러 효과는 alpha: 1로 시작해야 블러가 보임 (블러 효과 케이스에서 별도 처리)
    const isBlurEffect = actualTransition === 'blur'
    toSprite.visible = true
    toSprite.alpha = isBlurEffect ? 1 : 0 // 블러 효과는 alpha: 1, 나머지는 alpha: 0
    if (toText) {
      toText.visible = true
      toText.alpha = 1 // 자막은 항상 alpha: 1로 표시 (효과 없음)
    }
    
    // 초기 상태 설정 (렌더링은 PixiJS ticker가 처리)

    // 같은 씬의 여러 구간에 확대/축소 효과를 연속으로 적용할 때 이전 타임라인 정리
    // 확대/축소 효과는 같은 씬의 여러 구간에 연속으로 적용할 때도 전환 효과를 적용해야 하므로
    // 이전 타임라인을 정리하여 충돌 방지
    if (activeAnimationsRef.current.has(sceneIndex)) {
      const previousTl = activeAnimationsRef.current.get(sceneIndex)
      if (previousTl && (actualTransition === 'zoom-in' || actualTransition === 'zoom-out')) {
        try {
          if (previousTl.isActive()) {
            previousTl.kill()
          }
        } catch (error) {
          console.warn('[usePixiEffects] Error killing previous timeline:', error)
        }
        activeAnimationsRef.current.delete(sceneIndex)
      }
    }

    // Timeline 생성 (paused 상태로 시작하여 Transport가 제어하도록 함)
    const tl = gsap.timeline({
      timeScale: playbackSpeed,
      paused: true, // Transport 어댑터가 시간에 맞춰 제어하도록 paused 상태로 시작
      onComplete: () => {
        // 전환 효과 완료 후: 이미지가 이미 보이는 상태라면 그대로 유지 (깜빡임 방지)
        // 씬이 넘어가지 않는다면 이미지가 그대로 남아있어야 함
        if (toSprite) {
          // 컨테이너에 없으면 추가 (필요한 경우에만)
          // UX 개선: removeChild/addChild 대신 부모 확인 후 필요시에만 이동
          if (containerRef.current && toSprite.parent !== containerRef.current) {
            if (toSprite.parent) {
              toSprite.parent.removeChild(toSprite)
            }
            containerRef.current.addChild(toSprite)
          }
          
          // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
          // UX 개선: 자막이 항상 위에 오도록 보장
          if (containerRef.current && toSprite.parent === containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toSprite)
            if (currentIndex !== 0) {
              containerRef.current.setChildIndex(toSprite, 0)
            }
          }
          
          // UX 개선: 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
          // 보이지 않는 경우에만 부드럽게 보이게 설정
          if (!toSprite.visible || toSprite.alpha < 1) {
            toSprite.visible = true
            // alpha를 즉시 1로 설정하지 않고 부드럽게 전환 (이미 애니메이션 중이면 그대로 유지)
            if (toSprite.alpha === 0) {
              toSprite.alpha = 1
            }
          }
          
          // 필터 제거 (블러 등) - 항상 제거
          if (toSprite.filters && toSprite.filters.length > 0) {
            toSprite.filters = []
          }
          // 마스크 제거 (원형 등) - 항상 제거
          if (toSprite.mask) {
            toSprite.mask = null
          }
          
          // 확대/축소 효과인 경우 원래 스케일로 복귀 (다른 효과들과 동일하게)
          if (actualTransition === 'zoom-in' || actualTransition === 'zoom-out') {
            // 원래 스케일로 복귀 (zoom.ts에서 timeline.call()로 이미 처리되지만, 여기서도 보장)
            if (toSprite && !toSprite.destroyed) {
              toSprite.scale.set(originalScaleX, originalScaleY)
              toSprite.x = originalX
              toSprite.y = originalY
            }
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
          if (toText && containerRef.current && toText.parent === containerRef.current) {
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
          if (toText.parent === containerRef.current && containerRef.current) {
            const currentIndex = containerRef.current.getChildIndex(toText)
            const maxIndex = containerRef.current.children.length - 1
            if (currentIndex !== maxIndex) {
              containerRef.current.setChildIndex(toText, maxIndex)
            }
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
      fromSprite, // 이전 씬의 스프라이트 전달
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
      onComplete,
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
              // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
              if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                if (toSprite.parent) {
                  toSprite.parent.removeChild(toSprite)
                }
                containerRef.current.addChild(toSprite)
                // 이미지가 추가된 후 자막을 맨 위로 올림
                if (toText && containerRef.current && toText.parent === containerRef.current) {
                  const textIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (textIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
                }
              }
              toSprite.rotation = toRotateObj.rotation
              toSprite.alpha = 1
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
                  if (toText.parent === containerRef.current && containerRef.current) {
                    const currentIndex = containerRef.current.getChildIndex(toText)
                    const maxIndex = containerRef.current.children.length - 1
                    if (currentIndex !== maxIndex) {
                      containerRef.current.setChildIndex(toText, maxIndex)
                    }
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
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
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
                if (toText.parent === containerRef.current && containerRef.current) {
                  const currentIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (currentIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
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
          // 페이드와의 차이: 블러 필터를 사용하여 흐릿한 상태에서 선명하게 변함
          // 중요: alpha는 1로 유지해야 블러 효과가 보임 (alpha: 0이면 블러가 안 보여서 페이드처럼 보임)
          
          // 컨테이너에 먼저 추가 (필터 적용 전에 컨테이너에 있어야 함)
          if (toSprite.parent !== containerRef.current) {
            if (toSprite.parent) {
              toSprite.parent.removeChild(toSprite)
            }
            containerRef.current.addChild(toSprite)
            containerRef.current.setChildIndex(toSprite, 0)
          }
          
          // 기존 필터 제거 (다른 효과에서 남아있을 수 있음)
          toSprite.filters = []
          
          // 블러 필터 생성 및 적용
          const toBlurFilter = new PIXI.BlurFilter()
          toBlurFilter.strength = 30 // 블러 효과를 더 강하게 (페이드와 차이 명확화) - PixiJS v8.3.0+에서는 strength 사용
          toSprite.filters = [toBlurFilter]
          
          // 스프라이트를 보이게 설정 (블러 효과가 보이도록 alpha: 1)
          // 필터 적용 후에 visible/alpha 설정하여 블러가 보이도록 함
          // 스프라이트가 여전히 유효한지 확인
          if (!toSprite || toSprite.destroyed || !containerRef.current) {
            return
          }
          
          toSprite.visible = true
          toSprite.alpha = 1
          
          // 초기 렌더링 강제 (블러 상태가 보이도록)
          // 스프라이트가 컨테이너에 있는지 확인 후 렌더링
          if (appRef.current && toSprite.parent === containerRef.current && !toSprite.destroyed) {
            try {
              appRef.current.render()
            } catch (error) {
              // 렌더링 중 에러 발생 시 무시 (스프라이트가 destroyed될 수 있음)
            }
          }
          
          const toBlurObj = { blur: 30 }
          tl.to(toBlurObj, { 
            blur: 0, 
            duration, 
            onUpdate: function() {
              // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                if (toSprite.parent) {
                  toSprite.parent.removeChild(toSprite)
                }
                containerRef.current.addChild(toSprite)
                // 이미지가 추가된 후 자막을 맨 위로 올림
                if (toText && containerRef.current && toText.parent === containerRef.current) {
                  const textIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (textIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
                }
              }
              // 블러 필터 값 업데이트 (직접 참조 사용) - PixiJS v8.3.0+에서는 strength 사용
              toBlurFilter.strength = toBlurObj.blur
              // alpha는 1로 유지 (블러 효과가 보이도록)
              toSprite.alpha = 1
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: () => {
              // 블러 효과 완료 후 필터 제거 및 스프라이트 보이도록 보장
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
              toSprite.filters = []
              // 이미 보이는 상태라면 visible/alpha를 건드리지 않음 (깜빡임 방지)
              if (!toSprite.visible || toSprite.alpha < 1) {
                toSprite.visible = true
                toSprite.alpha = 1
              }
              // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
              if (toSprite.parent === containerRef.current) {
                containerRef.current.setChildIndex(toSprite, 0)
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
                if (toText.parent === containerRef.current && containerRef.current) {
                  const currentIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (currentIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
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
          if (!toSprite || toSprite.destroyed) {
            break
          }
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
                if (!toSprite || toSprite.destroyed) {
                  return
                }
                toSprite.x = glitchObj.x
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
              // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
              if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                if (toSprite.parent) {
                  toSprite.parent.removeChild(toSprite)
                }
                containerRef.current.addChild(toSprite)
                // 이미지가 추가된 후 자막을 맨 위로 올림
                if (toText && containerRef.current && toText.parent === containerRef.current) {
                  const textIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (textIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
                }
              }
              toSprite.x = glitchObj.x
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
            },
            onComplete: () => {
              // 글리치 효과 완료 후 스프라이트가 확실히 보이도록 보장
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
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
                if (toText.parent === containerRef.current && containerRef.current) {
                  const currentIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (currentIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
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
        if (!containerRef.current || !toSprite || toSprite.destroyed) {
          break
        }

        // 스프라이트를 컨테이너에 추가
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
        
        // 스프라이트를 먼저 보이게 설정 (마스크가 적용되면 마스크 영역만 보임)
        toSprite.visible = true
        toSprite.alpha = 1

        // 스프라이트의 실제 크기 계산 (스케일 적용)
        const spriteWidth = toSprite.texture.width * originalScaleX
        const spriteHeight = toSprite.texture.height * originalScaleY
        
        // 대각선 길이의 절반을 최대 반지름으로 사용
        const maxRadius = Math.sqrt(
          Math.pow(spriteWidth / 2, 2) +
          Math.pow(spriteHeight / 2, 2)
        )

        // 원형 마스크 생성
        // PixiJS에서 마스크는 스프라이트와 같은 부모 컨테이너에 있어야 함
        const mask = new PIXI.Graphics()
        // 마스크는 보이게 설정해야 효과가 작동함 (렌더링을 위해 필요)
        mask.visible = true
        // 마스크가 포인터 이벤트를 차단하지 않도록 설정
        mask.interactive = false
        mask.eventMode = 'none'
        
        // 스프라이트의 글로벌 위치를 마스크의 중심으로 사용
        // 스프라이트의 anchor가 (0.5, 0.5)이므로 x, y가 이미 중심점 좌표
        let centerX = toSprite.x
        let centerY = toSprite.y
        
        const state = { r: 0 }
        
        // 마스크를 컨테이너에 추가 (스프라이트와 같은 부모)
        containerRef.current.addChild(mask)
        
        // 스프라이트에 마스크 적용 (마스크를 먼저 추가한 후 적용)
        toSprite.mask = mask
        
        const drawMask = () => {
          mask.clear()
          // 마스크는 흰색으로 채워서 마스크 영역을 정의
          // 컨테이너의 글로벌 좌표계에서 스프라이트의 중심 위치를 기준으로 원 그리기
          // [PixiJS v8] circle을 먼저 호출한 후 fill을 호출해야 함
          mask.circle(centerX, centerY, state.r)
          mask.fill({ color: 0xffffff, alpha: 1 })
        }
        
        // 초기 마스크 그리기 (반지름 0으로 시작 - 아무것도 보이지 않음)
        drawMask()

        tl.to(state, {
          r: maxRadius,
          duration,
          ease: 'power2.out',
          onUpdate: () => {
            // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
            if (!toSprite || toSprite.destroyed || !containerRef.current) {
              return
            }
            // 스프라이트가 컨테이너에 있는지 확인
            if (!toSprite.parent || toSprite.parent !== containerRef.current) {
              if (toSprite.parent) {
                toSprite.parent.removeChild(toSprite)
              }
              containerRef.current.addChild(toSprite)
            }
            // 이미지를 맨 뒤로 보냄 (자막이 위에 오도록)
            if (toSprite.parent === containerRef.current) {
              containerRef.current.setChildIndex(toSprite, 0)
            }
            toSprite.visible = true
            toSprite.alpha = 1
            
            // 스프라이트 위치 업데이트 (destroyed 체크 후)
            if (!toSprite.destroyed) {
              centerX = toSprite.x
              centerY = toSprite.y
            }
            
            // 마스크가 컨테이너에 있는지 확인
            if (containerRef.current && mask.parent !== containerRef.current) {
              if (mask.parent) {
                mask.parent.removeChild(mask)
              }
              containerRef.current.addChild(mask)
            }
            
            // 스프라이트에 마스크가 적용되어 있는지 확인
            if (toSprite.mask !== mask) {
              toSprite.mask = mask
            }
            
            // 마스크를 다시 그리기 (반지름이 증가하면서 점진적으로 나타남)
            drawMask()
          },
          onComplete: () => {
            // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
            if (!toSprite || toSprite.destroyed || !containerRef.current) {
              // mask 정리는 toSprite가 없어도 수행
              if (mask.parent) {
                mask.parent.removeChild(mask)
              }
              mask.destroy()
              return
            }
            // 원형 마스크 제거 (효과 완료 후 전체 이미지 표시)
            toSprite.mask = null
            if (mask.parent) {
              mask.parent.removeChild(mask)
            }
            mask.destroy()
            
            // 스프라이트가 확실히 보이도록 보장
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
            toSprite.visible = true
            toSprite.alpha = 1
            
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
              if (toText.parent === containerRef.current && containerRef.current) {
                const currentIndex = containerRef.current.getChildIndex(toText)
                const maxIndex = containerRef.current.children.length - 1
                if (currentIndex !== maxIndex) {
                  containerRef.current.setChildIndex(toText, maxIndex)
                }
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
              // 매 프레임마다 null/destroyed 체크 (애니메이션 중에 toSprite가 destroyed될 수 있음)
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
              if (toSprite.parent !== containerRef.current) {
                if (toSprite.parent) {
                  toSprite.parent.removeChild(toSprite)
                }
                containerRef.current.addChild(toSprite)
                // 이미지가 추가된 후 자막을 맨 위로 올림
                if (toText && containerRef.current && toText.parent === containerRef.current) {
                  const textIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (textIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
                }
              }
              toSprite.alpha = defaultFadeObj.alpha
              // 텍스트는 onUpdate에서 처리하지 않음 (깜빡임 방지)
              // 렌더링은 PixiJS ticker가 처리하므로 여기서는 제거 (중복 렌더링 방지)
            },
            onComplete: () => {
              // 페이드 효과 완료 후 스프라이트가 확실히 보이도록 보장
              if (!toSprite || toSprite.destroyed || !containerRef.current) {
                return
              }
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
                if (toText.parent === containerRef.current && containerRef.current) {
                  const currentIndex = containerRef.current.getChildIndex(toText)
                  const maxIndex = containerRef.current.children.length - 1
                  if (currentIndex !== maxIndex) {
                    containerRef.current.setChildIndex(toText, maxIndex)
                  }
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

    // Transport 기반 렌더링에서는 timeline을 paused 상태로 유지하여 Transport 어댑터가 제어하도록 함
    // 기존 방식(레거시)에서는 timeline을 재생해야 하므로, isPlaying이 false일 때만 play() 호출
    // Transport 기반 렌더링에서는 어댑터가 syncPlaybackState를 통해 제어하므로 여기서 play()하지 않음
    if (!isPlaying) {
      // 편집 모드나 레거시 방식: timeline을 즉시 재생
      requestAnimationFrame(() => {
        if (tl && tl.paused()) {
          tl.play()
        }
      })
    }
    // Transport 기반 렌더링(isPlaying === true)에서는 어댑터가 제어하므로 play() 호출하지 않음
  }, [appRef, containerRef, activeAnimationsRef, timeline, playbackSpeed, onAnimationComplete])

  return {
    applyEnterEffect,
  }
}
