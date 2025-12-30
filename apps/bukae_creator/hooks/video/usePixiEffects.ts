import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import { createGlowFilter, createGlitchFilter, createParticleSystem } from '@/utils/pixi'

// "움직임" 효과 목록 (그룹 내 전환 효과 지속 대상)
const MOVEMENT_EFFECTS = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom-in', 'zoom-out']

interface UsePixiEffectsParams {
  appRef: React.RefObject<PIXI.Application | null>
  containerRef: React.RefObject<PIXI.Container | null>
  particlesRef: React.MutableRefObject<Map<number, PIXI.Container>>
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
  particlesRef,
  activeAnimationsRef,
  stageDimensions,
  timeline,
  playbackSpeed = 1.0,
  onAnimationComplete,
  isPlayingRef,
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
    onComplete?: (toText?: PIXI.Text | null) => void,
    _previousIndex?: number | null, // 추가 (현재 미사용, 향후 확장용)
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>, // 그룹별 Timeline 추적
    sceneId?: number // 현재 씬의 sceneId
  ) => {
    // applyEnterEffect 호출 시 toText 객체의 상태를 로깅
    // #region agent log
    if (toText) {
      const toTextDebugIdOnEntry = (toText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:100',message:'applyEnterEffect 진입 시 toText 상태',data:{sceneIndex,toTextAddress:String(toText),debugId:toTextDebugIdOnEntry,textText:toText.text,visible:toText.visible,alpha:toText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run34',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
    
    // handleScenePartSelect에서 설정한 텍스트를 저장 (전환 효과 애니메이션 중 유지하기 위해)
    // ref를 사용하여 전환 효과 중 텍스트가 변경되었는지 추적
    const savedTextRef = { value: toText ? toText.text : null }
    const savedDebugId = toText ? (toText as PIXI.Text & { __debugId?: string }).__debugId : null
    // #region agent log
    if (toText) {
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:100',message:'전환 효과 시작 시 텍스트 저장',data:{sceneIndex,textText:savedTextRef.value,debugId:savedDebugId || '없음'},timestamp:Date.now(),sessionId:'debug-session',runId:'run24',hypothesisId:'A'})}).catch(()=>{});
    }
    // #endregion
    
    // 그룹의 마지막 씬인지 확인 (움직임 효과인 경우)
    const isMovementEffect = sceneId !== undefined && MOVEMENT_EFFECTS.includes(transition)
    
    // 각 씬이 자신의 duration만큼만 전환 효과 사용
    // 움직임 효과인 경우에도 각 씬의 duration 사용
    const actualDuration = duration
    
    const isLastInGroup = isMovementEffect && timeline && sceneId !== undefined
      ? !timeline.scenes.some((s, idx) => idx > sceneIndex && s.sceneId === sceneId)
      : true // 움직임 효과가 아니면 항상 마지막으로 간주
    // 현재는 사용하지 않지만, 향후 이전 씬 정보 활용을 위해 자리 유지
    void _previousIndex
    const actualTransition = (forceTransition || transition || 'none').trim().toLowerCase()
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:112',message:'applyEnterEffect 시작',data:{sceneIndex,transition:actualTransition,duration,toSprite:!!toSprite,toText:!!toText,hasApp:!!appRef.current,hasContainer:!!containerRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!toSprite || !appRef.current || !containerRef.current) {
      console.error(`[전환효과] 필수 요소 없음`)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:115',message:'applyEnterEffect 필수 요소 없음으로 리턴',data:{toSprite:!!toSprite,hasApp:!!appRef.current,hasContainer:!!containerRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return
    }
    
    // transition이 'none'이면 애니메이션 없이 즉시 표시
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
      
      // 즉시 표시
      toSprite.visible = true
      toSprite.alpha = 1
      if (toText) {
        toText.visible = true
        toText.alpha = 1
      }
      
      if (appRef.current) {
        appRef.current.render()
      }
      
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
    // 원래 위치 및 스케일 계산 (현재 스프라이트의 실제 스케일 사용)
    let originalX = toSprite.x
    let originalY = toSprite.y
    // 스프라이트의 현재 실제 스케일을 읽어서 사용 (비율 유지)
    const originalScaleX = toSprite.scale.x
    const originalScaleY = toSprite.scale.y
    // 비율을 유지하기 위해 평균값 사용 (또는 더 작은 값 사용)
    const originalScale = originalScaleX // X 스케일을 기준으로 사용 (비율 유지)
    const scaleRatio = originalScaleY / originalScaleX // Y/X 비율 저장
    
    if (timeline?.scenes[sceneIndex]?.imageTransform) {
      const transform = timeline.scenes[sceneIndex].imageTransform!
      originalX = transform.x
      originalY = transform.y
    }


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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:209',message:'Timeline 생성 시작',data:{sceneIndex,transition:actualTransition,duration,playbackSpeed},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const tl = gsap.timeline({
      timeScale: playbackSpeed, // 배속에 맞게 애니메이션 속도 조정
      onStart: () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:213',message:'Timeline 시작',data:{sceneIndex,transition:actualTransition},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      },
      onComplete: () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:216',message:'Timeline 완료',data:{sceneIndex,transition:actualTransition},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        // 전환 효과 완료 후 이전 씬 숨기기
        // 이전 씬 인덱스는 updateCurrentScene에서 전달받아야 함
        // 하지만 현재는 직접 접근할 수 없으므로, onComplete 콜백에서 처리하도록 해야 함
        
        if (toSprite) {
          toSprite.visible = true
          toSprite.alpha = 1
        }
        if (toText) {
          // handleScenePartSelect에서 설정한 텍스트 확인
          // 디버그 ID가 있거나, 텍스트가 저장된 텍스트와 다르면 handleScenePartSelect에서 업데이트된 것으로 간주
          const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
          const isManuallyUpdated = (currentDebugId && currentDebugId.startsWith('text_')) || 
            (toText.text && toText.text !== savedTextRef.value && toText.text !== '와 대박!')
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:250',message:'Timeline 완료 후 텍스트 복원 시작',data:{sceneIndex,currentDebugId:currentDebugId || '없음',currentTextText:toText.text,savedText:savedTextRef.value,savedDebugId:savedDebugId || '없음',isManuallyUpdated,toTextAddress:String(toText)},timestamp:Date.now(),sessionId:'debug-session',runId:'run32',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          
          if (isManuallyUpdated) {
            // handleScenePartSelect에서 업데이트한 텍스트를 유지 (복원하지 않음)
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:239',message:'Timeline 완료 후 수동 업데이트된 텍스트 유지',data:{sceneIndex,textText:toText.text,debugId:currentDebugId || '없음',savedText:savedTextRef.value},timestamp:Date.now(),sessionId:'debug-session',runId:'run24',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          } else if (savedTextRef.value && savedTextRef.value !== toText.text) {
            // 저장된 텍스트로 복원
            toText.text = savedTextRef.value
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:245',message:'Timeline 완료 후 텍스트 복원',data:{sceneIndex,oldText:toText.text,newText:savedTextRef.value,debugId:savedDebugId || '없음'},timestamp:Date.now(),sessionId:'debug-session',runId:'run24',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
          }
          // 디버그 ID도 복원 (수동 업데이트가 아닌 경우에만)
          if (!isManuallyUpdated && savedDebugId && savedDebugId.startsWith('text_')) {
            (toText as PIXI.Text & { __debugId?: string }).__debugId = savedDebugId
          }
          // visible과 alpha 설정
          toText.visible = true
          toText.alpha = 1
          // #region agent log
          const finalDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:258',message:'Timeline 완료 후 텍스트 상태',data:{sceneIndex,textText:toText.text,debugId:finalDebugId,visible:toText.visible,alpha:toText.alpha,isManuallyUpdated,toTextAddress:String(toText)},timestamp:Date.now(),sessionId:'debug-session',runId:'run32',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
        if (appRef.current) {
          appRef.current.render()
        }
        
        // "움직임" 효과이고 그룹의 마지막 씬이 아닌 경우
        // Timeline을 완료하지 않고 계속 진행 (재생 중이든 아니든 상관없이)
        if (isMovementEffect && !isLastInGroup) {
          // Timeline을 완료하지 않고 계속 진행
          // activeAnimationsRef에서 삭제하지 않음
          // onComplete 콜백도 호출하지 않음 (자막 변경만 처리)
          // 재생 중에는 시간 기반으로 씬이 변경되므로 onComplete는 재생 로직에서 처리
          return
        }
        
        activeAnimationsRef.current.delete(sceneIndex)
        
        // 전달된 onComplete 콜백이 있으면 우선 호출 (재생 중 다음 씬으로 넘어갈 때 사용)
        // onComplete 호출 전에 toText 객체의 상태를 로깅
        if (toText) {
          const finalDebugIdBeforeOnComplete = (toText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:297',message:'onComplete 호출 전 toText 상태',data:{sceneIndex,toTextAddress:String(toText),debugId:finalDebugIdBeforeOnComplete,textText:toText.text,visible:toText.visible,alpha:toText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run33',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        }
        
        if (onComplete) {
          onComplete(toText)
        }
        
        // onComplete 호출 후에 toText 객체의 상태를 로깅
        if (toText) {
          const finalDebugIdAfterOnComplete = (toText as PIXI.Text & { __debugId?: string }).__debugId || '없음'
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:310',message:'onComplete 호출 후 toText 상태',data:{sceneIndex,toTextAddress:String(toText),debugId:finalDebugIdAfterOnComplete,textText:toText.text,visible:toText.visible,alpha:toText.alpha},timestamp:Date.now(),sessionId:'debug-session',runId:'run33',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
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
    
    // 텍스트는 효과 없이 즉시 표시
    const applyTextFade = () => {
      if (!toText) return
      toText.alpha = 1
      toText.visible = true
      if (toText.mask) {
        toText.mask = null
      }
      // 페이드 효과 제거 - 즉시 표시
      if (appRef.current) {
        appRef.current.render()
      }
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
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                // parent가 null이거나 containerRef.current가 아니면 추가
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  // 경고는 한 번만 출력
                  if (!hasWarnedAboutParent) {
                    hasWarnedAboutParent = true
                  }
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                
                toSprite.alpha = fadeObj.alpha
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:375',message:'fade onUpdate - 텍스트 alpha 업데이트 전',data:{sceneIndex,currentDebugId:currentDebugId || '없음',isManuallyUpdated,fadeObjAlpha:fadeObj.alpha,currentTextAlpha:toText.alpha,currentTextText:toText.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run26',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  // visible은 항상 true로 유지
                  toText.visible = true
                  // alpha는 변경하지 않음 (현재 alpha 유지)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:385',message:'fade onUpdate - 수동 업데이트된 텍스트 alpha 유지',data:{sceneIndex,currentDebugId,currentTextAlpha:toText.alpha,currentTextText:toText.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run26',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    // #region agent log
                    fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:338',message:'전환 효과 중 텍스트 업데이트 감지',data:{sceneIndex,oldSavedText:savedTextRef.value,newText:toText.text,debugId:currentDebugId},timestamp:Date.now(),sessionId:'debug-session',runId:'run26',hypothesisId:'A'})}).catch(()=>{});
                    // #endregion
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  toText.alpha = fadeObj.alpha
                  toText.visible = true
                }
              }
              
              // PixiJS 렌더링 강제 실행
              if (appRef.current) {
                appRef.current.render()
              }
            },
            onComplete: function() {
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
          // 이미지 내부에서 움직임: 시작 위치를 약간 오른쪽으로 설정
          if (!toSprite) break
          
          const offsetX = stageWidth * 0.1
          const toSlideLeftObj = { x: originalX + offsetX }
          toSprite.x = originalX + offsetX
          toSprite.alpha = 1 // 페이드 없이 항상 보이도록
          toSprite.visible = true
          
          // 디버깅: duration이 제대로 전달되었는지 확인
          if (isMovementEffect) {
            console.log(`[usePixiEffects] slide-left duration:`, actualDuration, '(그룹 전체 TTS duration)', 'sceneIndex:', sceneIndex, 'sceneId:', sceneId, 'isLastInGroup:', isLastInGroup)
          }
          
          tl.to(toSlideLeftObj, { 
            x: originalX, 
            duration: actualDuration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // toSprite가 여전히 유효한지 다시 확인
                if (toSprite) {
                  toSprite.x = toSlideLeftObj.x
                  toSprite.alpha = 1 // 항상 보이도록 유지
                }
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:461',message:'slide-left onUpdate - 텍스트 alpha 업데이트 전',data:{sceneIndex,currentDebugId:currentDebugId || '없음',isManuallyUpdated,currentTextAlpha:toText.alpha,currentTextText:toText.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run27',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // alpha는 변경하지 않음 (현재 alpha 유지)
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/c380660c-4fa0-4bba-b6e2-542824dcb4d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePixiEffects.ts:470',message:'slide-left onUpdate - 수동 업데이트된 텍스트 alpha 유지',data:{sceneIndex,currentDebugId,currentTextAlpha:toText.alpha,currentTextText:toText.text},timestamp:Date.now(),sessionId:'debug-session',runId:'run27',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  toText.alpha = 1 // 텍스트도 페이드 없이 표시
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'slide-right':
        {
          // 이미지 내부에서 움직임: 시작 위치를 약간 왼쪽으로 설정
          if (!toSprite) break
          
          const offsetX = stageWidth * 0.1
          const toSlideRightObj = { x: originalX - offsetX }
          toSprite.x = originalX - offsetX
          toSprite.alpha = 1 // 페이드 없이 항상 보이도록
          toSprite.visible = true
          
          tl.to(toSlideRightObj, { 
            x: originalX, 
            duration: actualDuration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // toSprite가 여전히 유효한지 다시 확인
                if (toSprite) {
                  toSprite.x = toSlideRightObj.x
                  toSprite.alpha = 1 // 항상 보이도록 유지
                }
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  toText.alpha = 1 // 텍스트도 페이드 없이 표시
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'slide-up':
        {
          // 이미지 내부에서 움직임: 시작 위치를 약간 아래로 설정
          if (!toSprite) break
          
          const offsetY = stageHeight * 0.1
          const toSlideUpObj = { y: originalY + offsetY }
          toSprite.y = originalY + offsetY
          toSprite.alpha = 1 // 페이드 없이 항상 보이도록
          toSprite.visible = true
          
          tl.to(toSlideUpObj, { 
            y: originalY, 
            duration: actualDuration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // toSprite가 여전히 유효한지 다시 확인
                if (toSprite) {
                  toSprite.y = toSlideUpObj.y
                  toSprite.alpha = 1 // 항상 보이도록 유지
                }
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  toText.alpha = 1 // 텍스트도 페이드 없이 표시
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'slide-down':
        {
          // 이미지 내부에서 움직임: 시작 위치를 약간 위로 설정
          if (!toSprite) break
          
          const offsetY = stageHeight * 0.1
          const toSlideDownObj = { y: originalY - offsetY }
          toSprite.y = originalY - offsetY
          toSprite.alpha = 1 // 페이드 없이 항상 보이도록
          toSprite.visible = true
          
          tl.to(toSlideDownObj, { 
            y: originalY, 
            duration: actualDuration, 
            onUpdate: function() {
              // 스프라이트가 컨테이너에 있는지 확인하고 없으면 추가
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                // toSprite가 여전히 유효한지 다시 확인
                if (toSprite) {
                  toSprite.y = toSlideDownObj.y
                  toSprite.alpha = 1 // 항상 보이도록 유지
                }
              }
              
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  toText.alpha = 1 // 텍스트도 페이드 없이 표시
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'zoom-in':
        {
          // 확대: 현재 크기에서 점점 커지게 (비율 유지)
          const toZoomObj = { scale: originalScale, alpha: 0 }
          // 현재 스케일에서 시작 (비율 유지)
          toSprite.scale.set(originalScaleX, originalScaleY)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          // 중심점 계산 (스프라이트의 현재 중심)
          const centerX = originalX + (toSprite.texture.width * originalScaleX) / 2
          const centerY = originalY + (toSprite.texture.height * originalScaleY) / 2
          
          // 텍스트 페이드 객체 (이미지와 동시에 시작)
          const textFadeObj = { alpha: 0 }
          if (toText) {
            toText.alpha = 0
            toText.visible = true
            if (toText.mask) {
              toText.mask = null
            }
          }
          
          // 페이드 인과 확대를 동시에 진행
          tl.to(toZoomObj, { 
            alpha: 1,
            scale: originalScale * 1.15, 
            duration: actualDuration, 
            ease: 'power1.out',
            onUpdate: function() {
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                const scaleFactor = toZoomObj.scale
                toSprite.alpha = toZoomObj.alpha
                // 비율 유지하면서 스케일 적용
                toSprite.scale.set(scaleFactor, scaleFactor * scaleRatio)
                // 중심점 기준으로 위치 조정 (중심점 유지)
                const newWidth = toSprite.texture.width * scaleFactor
                const newHeight = toSprite.texture.height * scaleFactor * scaleRatio
                toSprite.x = centerX - newWidth / 2
                toSprite.y = centerY - newHeight / 2
              }
              
              // 텍스트도 동시에 페이드 인
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  // 이미지와 동일한 alpha 값 사용 (동시에 나타남)
                  textFadeObj.alpha = toZoomObj.alpha
                  toText.alpha = textFadeObj.alpha
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
        }
        break

      case 'zoom-out':
        {
          // 축소: 현재 크기에서 점점 작아지게 (비율 유지)
          const toZoomOutObj = { scale: originalScale, alpha: 0 }
          // 현재 스케일에서 시작 (비율 유지)
          toSprite.scale.set(originalScaleX, originalScaleY)
          // 스프라이트 초기 상태는 이미 위에서 설정됨 (visible: true, alpha: 0)
          
          // 중심점 계산 (스프라이트의 현재 중심)
          const centerX = originalX + (toSprite.texture.width * originalScaleX) / 2
          const centerY = originalY + (toSprite.texture.height * originalScaleY) / 2
          
          // 텍스트 페이드 객체 (이미지와 동시에 시작)
          const textFadeObj = { alpha: 0 }
          if (toText) {
            toText.alpha = 0
            toText.visible = true
            if (toText.mask) {
              toText.mask = null
            }
          }
          
          // 페이드 인과 축소를 동시에 진행
          tl.to(toZoomOutObj, { 
            alpha: 1,
            scale: originalScale * 0.85, 
            duration: actualDuration, 
            ease: 'power1.out',
            onUpdate: function() {
              if (toSprite && containerRef.current) {
                if (!toSprite.parent || toSprite.parent !== containerRef.current) {
                  if (toSprite.parent) {
                    toSprite.parent.removeChild(toSprite)
                  }
                  containerRef.current.addChild(toSprite)
                }
                const scaleFactor = toZoomOutObj.scale
                toSprite.alpha = toZoomOutObj.alpha
                // 비율 유지하면서 스케일 적용
                toSprite.scale.set(scaleFactor, scaleFactor * scaleRatio)
                // 중심점 기준으로 위치 조정 (중심점 유지)
                const newWidth = toSprite.texture.width * scaleFactor
                const newHeight = toSprite.texture.height * scaleFactor * scaleRatio
                toSprite.x = centerX - newWidth / 2
                toSprite.y = centerY - newHeight / 2
              }
              
              // 텍스트도 동시에 페이드 인
              if (toText && containerRef.current) {
                if (!toText.parent || toText.parent !== containerRef.current) {
                  if (toText.parent) {
                    toText.parent.removeChild(toText)
                  }
                  containerRef.current.addChild(toText)
                }
                // handleScenePartSelect에서 설정한 텍스트를 유지하기 위해 텍스트 내용은 변경하지 않음
                // handleScenePartSelect에서 설정한 텍스트가 있으면 alpha를 변경하지 않음 (깜빡임 방지)
                const currentDebugId = (toText as PIXI.Text & { __debugId?: string }).__debugId
                const isManuallyUpdated = currentDebugId && currentDebugId.startsWith('text_')
                if (isManuallyUpdated) {
                  // 수동 업데이트된 텍스트는 alpha를 변경하지 않음 (깜빡임 방지)
                  toText.visible = true
                  // 저장된 텍스트를 업데이트하여 전환 효과 완료 후 복원하지 않도록 함
                  if (toText.text !== savedTextRef.value) {
                    savedTextRef.value = toText.text
                  }
                } else {
                  // 수동 업데이트되지 않은 텍스트는 alpha 업데이트
                  // 이미지와 동일한 alpha 값 사용 (동시에 나타남)
                  textFadeObj.alpha = toZoomOutObj.alpha
                  toText.alpha = textFadeObj.alpha
                  toText.visible = true
                }
              }
              
              if (appRef.current) {
                appRef.current.render()
              }
            }
          }, 0)
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
              if (appRef.current) {
                appRef.current.render()
              }
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
                if (appRef.current) {
                  appRef.current.render()
                }
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
                if (appRef.current) {
                  appRef.current.render()
                }
              }
            }, waveStartTime + waveDuration * 0.5)
          }
          
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
              circleMask.beginFill(0xffffff)
              circleMask.drawCircle(stageWidth / 2, stageHeight / 2, maskRadius.value)
              circleMask.endFill()
              
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
        tl.play()
      }
      
      // 초기 상태 렌더링 (스프라이트가 visible: true, alpha: 0인 상태로 렌더링)
      if (appRef.current) {
        appRef.current.render()
      }
    })
  }, [appRef, containerRef, activeAnimationsRef, timeline, playbackSpeed, onAnimationComplete])

  return {
    applyAdvancedEffects,
    applyEnterEffect,
  }
}
