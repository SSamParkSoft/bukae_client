import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'
import * as fabric from 'fabric'
import { gsap } from 'gsap'
import { TimelineData } from '@/store/useVideoCreateStore'
import { calculateSpriteParams } from '@/utils/pixi'
import { resolveSubtitleFontFamily } from '@/lib/subtitle-fonts'
import { splitSubtitleByDelimiter } from '@/lib/utils/subtitle-splitter'

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
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  
  // State/Props
  timeline: TimelineData | null
  stageDimensions: { width: number; height: number }
  useFabricEditing: boolean
  
  // Functions
  loadPixiTextureWithCache: (url: string) => Promise<PIXI.Texture>
  applyEnterEffect: (
    toSprite: PIXI.Sprite | null,
    toText: PIXI.Text | null,
    transition: string,
    duration: number,
    stageWidth: number,
    stageHeight: number,
    sceneIndex: number,
    forceTransition?: string, // 강제로 적용할 전환 효과 (timeline 값 무시)
    onComplete?: () => void, // Timeline 완료 콜백
    previousIndex?: number | null, // 이전 씬 인덱스
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>, // 그룹별 Timeline 추적
    sceneId?: number, // 현재 씬의 sceneId
    isPlaying?: boolean // 재생 중인지 여부
  ) => void
  onLoadComplete?: (sceneIndex: number) => void // 로드 완료 후 콜백
  
  // Optional functions for renderSceneContent
  setTimeline?: (timeline: TimelineData) => void
  setCurrentSceneIndex?: (index: number) => void
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
  isManualSceneSelectRef,
  timeline,
  stageDimensions,
  useFabricEditing,
  loadPixiTextureWithCache,
  applyEnterEffect,
  onLoadComplete,
  setTimeline,
  setCurrentSceneIndex,
}: UseSceneManagerParams) => {
  // 그룹별 전환 효과 애니메이션 Timeline 추적 (sceneId를 키로 사용)
  const groupTransitionTimelinesRef = useRef<Map<number, gsap.core.Timeline>>(new Map())
  
  // renderSubtitlePart를 ref로 저장 (handleSkipAnimation에서 사용하기 위해)
  const renderSubtitlePartRef = useRef<((sceneIndex: number, partIndex: number | null, options?: { skipAnimation?: boolean; onComplete?: () => void; prepareOnly?: boolean }) => void) | null>(null)

  // 애니메이션 스킵 처리 헬퍼 함수
  const handleSkipAnimation = useCallback(({
    actualSceneIndex,
    previousIndex,
    currentSprite,
    previousSprite,
    previousText,
    isPlaying,
    partIndex,
    onAnimationComplete,
  }: {
    actualSceneIndex: number
    previousIndex: number | null
    currentScene: TimelineData['scenes'][number]
    currentSprite: PIXI.Sprite | null
    currentText: PIXI.Text | null
    previousSprite: PIXI.Sprite | null
    previousText: PIXI.Text | null
    isPlaying?: boolean
    partIndex?: number | null
    onAnimationComplete?: (sceneIndex: number) => void
  }) => {
    // 이미 같은 씬이 표시되어 있으면 텍스트만 업데이트
    const isAlreadyDisplayed = previousSceneIndexRef.current === actualSceneIndex
      && currentSprite?.visible
      && currentSprite?.alpha === 1

    if (isAlreadyDisplayed) {
      // 자막 렌더링은 renderSubtitlePart가 담당하므로 여기서는 처리하지 않음
      // onAnimationComplete를 호출하여 renderSceneContent의 onComplete에서 renderSubtitlePart 호출
      onAnimationComplete?.(actualSceneIndex)
      return
    }

    // 이전 씬 숨기기
    const shouldHidePrevious = previousIndex !== null && previousIndex !== actualSceneIndex
    if (shouldHidePrevious) {
      if (previousSprite) {
        previousSprite.visible = false
        previousSprite.alpha = 0
      }
      if (previousText) {
        previousText.visible = false
        previousText.alpha = 0
      }
    }

    // 다른 씬들 숨기기
    const shouldHideOthers = previousIndex === null && previousSceneIndexRef.current !== actualSceneIndex
    if (shouldHideOthers) {
      spritesRef.current.forEach((sprite, idx) => {
        if (sprite && idx !== actualSceneIndex) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== actualSceneIndex) {
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
    
    // 자막 렌더링은 renderSubtitlePart가 담당
    previousSceneIndexRef.current = actualSceneIndex
    
    // 재생 중이 아닐 때만 자막 렌더링 (재생 중에는 재생 로직에서 처리)
    if (!isPlaying && renderSubtitlePartRef.current) {
      // partIndex에 따라 renderSubtitlePart 호출
      if (partIndex !== undefined && partIndex !== null) {
        // partIndex가 있으면 해당 구간만 렌더링
        renderSubtitlePartRef.current(actualSceneIndex, partIndex, {
          skipAnimation: true,
          onComplete: () => {
            onAnimationComplete?.(actualSceneIndex)
          },
        })
      } else {
        // partIndex가 null이면 전체 자막 렌더링
        renderSubtitlePartRef.current(actualSceneIndex, null, {
          skipAnimation: true,
          onComplete: () => {
            onAnimationComplete?.(actualSceneIndex)
          },
        })
      }
    } else {
      // 재생 중이거나 renderSubtitlePart가 없으면 onAnimationComplete만 호출
      onAnimationComplete?.(actualSceneIndex)
    }
  }, [previousSceneIndexRef, spritesRef, textsRef, timeline])

  // 현재 씬 업데이트
  // previousIndex 파라미터: 명시적으로 이전 씬 인덱스를 전달받음 (optional, 없으면 previousSceneIndexRef 사용)
  // forceTransition: 강제로 적용할 전환 효과 (timeline 값 무시, 전환 효과 미리보기용)
  // isPlaying: 재생 중인지 여부 (재생 중일 때 텍스트 alpha: 0 설정)
  // skipImage: 이미지 렌더링 스킵 (전환 효과와 자막만 렌더링)
  const updateCurrentScene = useCallback((skipAnimation: boolean = false, explicitPreviousIndex?: number | null, forceTransition?: string, onAnimationComplete?: (sceneIndex: number) => void, isPlaying?: boolean, skipImage?: boolean, partIndex?: number | null, sceneIndex?: number) => {
    // 기본 값 설정
    const actualSceneIndex = sceneIndex !== undefined ? sceneIndex : currentSceneIndexRef.current
    const previousIndex = explicitPreviousIndex !== undefined ? explicitPreviousIndex : previousSceneIndexRef.current
    
    console.log(`[updateCurrentScene] 호출 | 씬 ${actualSceneIndex}, partIndex: ${partIndex}, isPlaying: ${isPlaying}, isManualSceneSelect: ${isManualSceneSelectRef.current}`)
    
    // 필수 참조 확인
    const hasRequiredRefs = containerRef.current && timeline && appRef.current
    if (!hasRequiredRefs) {
      console.log(`[updateCurrentScene] early return | containerRef: ${!!containerRef.current}, timeline: ${!!timeline}, appRef: ${!!appRef.current}`)
      return
    }

    // 씬 데이터 가져오기
    const currentScene = timeline.scenes[actualSceneIndex]
    const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null
    
    // 같은 씬 내 구간 전환 중인지 확인
    // selectPart에서 같은 씬 내 구간 전환인 경우 renderSubtitlePart만 사용하므로
    // updateCurrentScene은 스킵하여 자막이 첫 번째 구간으로 되돌아가는 것을 방지
    // isManualSceneSelectRef가 true이고 같은 씬이면 구간 전환으로 인식 (partIndex >= 0)
    // partIndex가 null이면 전체 자막 렌더링이므로 이 조건에 걸리지 않음
    // previousIndex가 actualSceneIndex와 같거나, previousIndex가 null이고 currentSceneIndexRef.current가 actualSceneIndex와 같으면 같은 씬으로 인식
    const isSameScene = previousIndex === actualSceneIndex 
      || (previousIndex === null && currentSceneIndexRef.current === actualSceneIndex)
    const isSameScenePartTransition = isManualSceneSelectRef.current 
      && isSameScene
      && partIndex !== null 
      && partIndex !== undefined
      && partIndex >= 0 // partIndex가 0 이상이면 같은 씬 내 구간 전환으로 인식
    
    if (isSameScenePartTransition) {
      console.log(`[updateCurrentScene] 같은 씬 내 구간 전환 중이므로 스킵 (renderSubtitlePart에서 처리됨) | 씬 ${actualSceneIndex}, partIndex: ${partIndex}, previousIndex: ${previousIndex}, currentSceneIndexRef: ${currentSceneIndexRef.current}`)
      // 이미지만 렌더링하고 자막은 건드리지 않음
      const currentSprite = spritesRef.current.get(actualSceneIndex)
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      // onAnimationComplete는 호출하지 않음 (renderSubtitlePart의 onComplete에서 처리)
      return
    }
    
    // isManualSceneSelectRef가 true이고 partIndex가 null이면 전체 자막 렌더링이므로
    // 자막을 건드리지 않고 이미지만 렌더링
    // previousIndex가 actualSceneIndex와 같거나, previousIndex가 null이고 currentSceneIndexRef.current가 actualSceneIndex와 같으면 같은 씬으로 인식
    const isSameSceneForNull = previousIndex === actualSceneIndex 
      || (previousIndex === null && currentSceneIndexRef.current === actualSceneIndex)
    if (isManualSceneSelectRef.current && isSameSceneForNull && partIndex === null) {
      console.log(`[updateCurrentScene] isManualSceneSelectRef가 true이고 partIndex가 null이므로 자막은 건드리지 않음 | 씬 ${actualSceneIndex}, previousIndex: ${previousIndex}, currentSceneIndexRef: ${currentSceneIndexRef.current}`)
      // 이미지만 렌더링하고 자막은 건드리지 않음
      const currentSprite = spritesRef.current.get(actualSceneIndex)
      if (currentSprite) {
        currentSprite.visible = true
        currentSprite.alpha = 1
      }
      if (onAnimationComplete) {
        onAnimationComplete(actualSceneIndex)
      }
      return
    }
    
    // 스프라이트 및 텍스트 객체 가져오기
    const currentSprite = spritesRef.current.get(actualSceneIndex)
    const currentText = textsRef.current.get(actualSceneIndex)
    const previousSprite = previousIndex !== null ? spritesRef.current.get(previousIndex) : null
    const previousText = previousIndex !== null ? textsRef.current.get(previousIndex) : null

    // 스프라이트 없음 처리
    if (!currentSprite) {
      console.warn(`[updateCurrentScene] 씬 ${actualSceneIndex} 스프라이트를 찾을 수 없음`)
      onAnimationComplete?.(actualSceneIndex)
      previousSceneIndexRef.current = actualSceneIndex
      return
    }

    // 같은 씬 내 구간 전환 처리
    // partIndex가 null이면 전체 자막을 렌더링해야 하므로 early return하지 않음
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 건드리지 않음
    const isSameSceneTransition = previousIndex === actualSceneIndex 
      && currentScene 
      && previousScene 
      && currentScene.sceneId === previousScene.sceneId
      && !skipImage
      && partIndex !== null && partIndex !== undefined // partIndex가 null이면 전체 자막 렌더링 필요
      && !isManualSceneSelectRef.current // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 처리했으므로 건드리지 않음
    
    if (isSameSceneTransition) {
      console.log(`[updateCurrentScene] 같은 씬 내 구간 전환 처리 | 씬 ${actualSceneIndex}, partIndex: ${partIndex}`)
      currentSprite.visible = true
      currentSprite.alpha = 1
      // 자막은 renderSubtitlePart에서 이미 업데이트했으므로 건드리지 않음
      return
    }

    // 애니메이션 스킵 시 즉시 표시
    if (skipAnimation) {
      handleSkipAnimation({
        actualSceneIndex,
        previousIndex,
        currentScene,
        currentSprite: currentSprite ?? null,
        currentText: currentText ?? null,
        previousSprite: previousSprite ?? null,
        previousText: previousText ?? null,
        isPlaying,
        partIndex,
        onAnimationComplete: () => {
          // handleSkipAnimation 완료 후 onAnimationComplete 호출하여 renderSceneContent의 onComplete 실행
          onAnimationComplete?.(actualSceneIndex)
        },
      })
      return
    }
    
    // 그룹 정보 계산
    // splitIndex가 있으면 분할된 독립적인 씬이므로 같은 그룹으로 처리하지 않음
    const hasSceneId = currentScene.sceneId !== undefined
    const hasSplitIndex = currentScene.splitIndex !== undefined
    const previousHasSplitIndex = previousScene?.splitIndex !== undefined
    
    // splitIndex가 있으면 독립적인 씬으로 처리 (같은 그룹 아님)
    const isInSameGroup = previousScene 
      && currentScene 
      && hasSceneId
      && previousScene.sceneId === currentScene.sceneId
      && !hasSplitIndex // splitIndex가 있으면 같은 그룹이 아님
      && !previousHasSplitIndex // 이전 씬도 splitIndex가 있으면 같은 그룹이 아님
    
    const firstSceneIndex = isInSameGroup && hasSceneId
      ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
      : -1
    const isFirstSceneInGroup = firstSceneIndex === actualSceneIndex
    
    // 그룹 전환 시 이전 그룹 Timeline 정리
    const isGroupTransition = previousScene && previousScene.sceneId !== currentScene.sceneId
    if (isGroupTransition) {
      const previousGroupTimeline = groupTransitionTimelinesRef.current.get(previousScene.sceneId)
      previousGroupTimeline?.kill()
      groupTransitionTimelinesRef.current.delete(previousScene.sceneId)
    }
    
    // 같은 그룹 내 씬 전환 (첫 번째 씬이 아닌 경우)
    if (isInSameGroup && !isFirstSceneInGroup) {
    // 같은 그룹 내 씬: 이미지와 전환 효과는 첫 번째 씬에서 이미 적용됨, 자막만 변경
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 건드리지 않음
    if (!isManualSceneSelectRef.current) {
      let textToUpdate = currentText
      
      if (!textToUpdate && currentScene.sceneId !== undefined) {
        // 같은 그룹 내 첫 번째 씬의 텍스트 객체 사용
        const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
        if (firstSceneIndexInGroup >= 0) {
          textToUpdate = textsRef.current.get(firstSceneIndexInGroup) || undefined
        }
      }
      
      if (textToUpdate && currentScene.text?.content) {
        // partIndex가 null이면 전체 자막 표시, 아니면 구간이 나뉘어져 있으면 첫 번째 구간만 표시
        let displayText: string
        if (partIndex === null || partIndex === undefined) {
          // 전체 자막 표시
          displayText = currentScene.text.content
        } else {
          // 구간이 나뉘어져 있으면 첫 번째 구간만 표시
          const scriptParts = currentScene.text.content.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          displayText = scriptParts.length > 1 ? scriptParts[0] : currentScene.text.content
        }
        if (textToUpdate.text !== displayText) {
          textToUpdate.text = displayText
        }
        textToUpdate.visible = displayText.length > 0
        textToUpdate.alpha = displayText.length > 0 ? 1 : 0
      }
    }
    
    // 렌더링은 PixiJS ticker가 처리
    previousSceneIndexRef.current = actualSceneIndex
    return
    }
    
    // 전환 효과 시작 전에 이전 씬 숨기기
    const shouldHidePreviousBeforeTransition = previousIndex !== null && previousIndex !== actualSceneIndex
    if (shouldHidePreviousBeforeTransition) {
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
        if (sprite && idx !== actualSceneIndex && idx !== previousIndex) {
          sprite.visible = false
          sprite.alpha = 0
        }
      })
      // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 텍스트는 건드리지 않음
      if (!isManualSceneSelectRef.current) {
        textsRef.current.forEach((text, idx) => {
          if (text && idx !== actualSceneIndex && idx !== previousIndex) {
            text.visible = false
            text.alpha = 0
          }
        })
      }
    }
    
    // 전환 효과 적용을 위한 wrappedOnComplete 미리 정의
    const wrappedOnComplete = onAnimationComplete ? () => {
    // 전환 효과 완료 후 최종 정리
    // 다른 모든 씬들 숨기기
    spritesRef.current.forEach((sprite, idx) => {
      if (sprite && idx !== actualSceneIndex) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 텍스트는 건드리지 않음
    if (!isManualSceneSelectRef.current) {
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== actualSceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
    }
    
    // 최종 렌더링
    // 렌더링은 PixiJS ticker가 처리
    
    // 원래 onAnimationComplete 콜백 호출
    onAnimationComplete(actualSceneIndex)
    } : (() => {
    // onAnimationComplete가 없어도 최종 정리
    spritesRef.current.forEach((sprite, idx) => {
      if (sprite && idx !== actualSceneIndex) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 텍스트는 건드리지 않음
    if (!isManualSceneSelectRef.current) {
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== actualSceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
    }
    
    // 렌더링은 PixiJS ticker가 처리
    })
    
    // skipImage가 true이면 이미지는 전환 효과에만 사용하고, 전환 효과 후에는 숨김 (자막만 표시)
    // 전환 효과를 보여주려면 이미지가 필요하므로, 이미지를 렌더링하고 전환 효과를 적용한 후 숨김
    if (skipImage && currentSprite) {
    // 전환 효과를 적용하기 위해 이미지를 렌더링
    // 하지만 전환 효과가 끝나면 이미지를 숨기고 자막만 표시
    
    // 그룹의 첫 번째 씬 찾기 (같은 sceneId를 가진 씬들 중 첫 번째)
    const firstSceneIndex = currentScene.sceneId !== undefined 
      ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
      : -1
    const isFirstSceneInGroup = firstSceneIndex === actualSceneIndex
    
    // 같은 그룹 내 씬들은 항상 첫 번째 씬의 스프라이트 사용
    let spriteToUse = currentSprite
    if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
      const firstSprite = spritesRef.current.get(firstSceneIndex)
      if (firstSprite) {
        spriteToUse = firstSprite
      }
    }
    
    // transition 결정
    let transition: string
    let transitionDuration: number
    
    if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined) {
      const firstSceneInGroup = timeline.scenes[firstSceneIndex]
      transition = forceTransition || firstSceneInGroup?.transition || 'fade'
      transitionDuration = currentScene.duration && currentScene.duration > 0
        ? currentScene.duration
        : 0.5
    } else {
      transition = forceTransition || currentScene.transition || 'fade'
      transitionDuration = currentScene.transitionDuration && currentScene.transitionDuration > 0
        ? currentScene.transitionDuration
        : 0.5
    }
    
    const { width, height } = stageDimensions
    
    // 스프라이트를 컨테이너에 추가
    if (spriteToUse.parent !== containerRef.current && containerRef.current) {
      if (spriteToUse.parent) {
        spriteToUse.parent.removeChild(spriteToUse)
      }
      containerRef.current.addChild(spriteToUse)
    }
    
    // 이전 씬 숨기기
    if (previousIndex !== null && previousIndex !== actualSceneIndex) {
      const prevSprite = spritesRef.current.get(previousIndex)
      if (prevSprite) {
        prevSprite.visible = false
        prevSprite.alpha = 0
      }
    }
    
    // 다른 모든 씬들 숨기기
    spritesRef.current.forEach((sprite, idx) => {
      if (sprite && idx !== actualSceneIndex && idx !== previousIndex) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    
    // 전환 효과 적용 (이미지를 사용하여 전환 효과 렌더링)
    if (skipAnimation || transition === 'none') {
      // 애니메이션 없이 즉시 표시 (이미지는 그대로 표시)
      spriteToUse.visible = true
      spriteToUse.alpha = 1
      
      // 자막 표시
      if (currentText) {
        currentText.visible = true
        currentText.alpha = 1
      }
      
      previousSceneIndexRef.current = actualSceneIndex
      if (onAnimationComplete) {
        onAnimationComplete(actualSceneIndex)
      }
    } else {
      // 전환 효과 적용
      spriteToUse.visible = true
      spriteToUse.alpha = 0
      
      // applyEnterEffect를 사용하여 전환 효과 적용
      // 전환 효과가 진행되는 동안 이미지가 보이면서 전환 효과가 적용됨
      // 전환 효과가 끝나면 이미지를 숨기고 자막만 표시
      applyEnterEffect(
        spriteToUse,
        currentText || null,
        transition,
        transitionDuration,
        width,
        height,
        actualSceneIndex,
        forceTransition,
        () => {
          // 전환 효과 완료 후 이미지는 그대로 표시 (숨기지 않음)
          // 이미지는 이미 applyEnterEffect에서 alpha: 1로 설정되어 있음
          
          // 자막 표시
          if (currentText) {
            currentText.visible = true
            currentText.alpha = 1
          }
          
          previousSceneIndexRef.current = actualSceneIndex
          if (onAnimationComplete) {
            onAnimationComplete(actualSceneIndex)
          }
        },
        previousIndex,
        isFirstSceneInGroup ? groupTransitionTimelinesRef : undefined,
        currentScene.sceneId,
        isPlaying
      )
      // 전환 효과가 정상적으로 작동하여 이미지가 보이면서 전환 효과가 적용됨
    }
    return
    }
    
    // 현재 씬 등장 효과 적용
    if (currentSprite) {
    // 그룹의 첫 번째 씬 찾기 (같은 sceneId를 가진 씬들 중 첫 번째)
    const firstSceneIndex = currentScene.sceneId !== undefined 
      ? timeline.scenes.findIndex((s) => s.sceneId === currentScene.sceneId)
      : -1
    const firstSceneSprite = firstSceneIndex >= 0 ? spritesRef.current.get(firstSceneIndex) : null
    const isFirstSceneInGroup = firstSceneIndex === actualSceneIndex
    
    // 같은 그룹 내 씬인지 확인 (이전 씬이 같은 그룹인 경우 또는 같은 씬 내 구간 전환)
    const previousScene = previousIndex !== null ? timeline.scenes[previousIndex] : null
    
    // previousIndex가 null이어도 같은 그룹 내 씬인지 확인
    // lastRenderedSceneIndexRef를 사용하여 이전에 렌더링된 씬이 같은 그룹인지 확인
    // splitIndex가 있으면 분할된 독립적인 씬이므로 같은 그룹으로 처리하지 않음
    let isInSameGroup = false
    const currentHasSplitIndex = currentScene.splitIndex !== undefined
    if (firstSceneIndex >= 0 && currentScene.sceneId !== undefined && !currentHasSplitIndex) {
      // previousIndex가 null이 아닌 경우 기존 로직 사용
      if (previousIndex !== null && previousScene !== null) {
        const previousHasSplitIndex = previousScene.splitIndex !== undefined
        isInSameGroup = (previousScene.sceneId === currentScene.sceneId || previousIndex === actualSceneIndex) && !previousHasSplitIndex
      } else {
        // previousIndex가 null인 경우 lastRenderedSceneIndexRef 사용
        const lastRenderedIndex = previousSceneIndexRef.current
        if (lastRenderedIndex !== null) {
          const lastRenderedScene = timeline.scenes[lastRenderedIndex]
          const lastRenderedHasSplitIndex = lastRenderedScene?.splitIndex !== undefined
          if (lastRenderedScene && lastRenderedScene.sceneId === currentScene.sceneId && !lastRenderedHasSplitIndex) {
            isInSameGroup = true
          }
        }
      }
    }
    
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
      if (previousSprite && previousIndex !== null && previousIndex !== actualSceneIndex) {
        previousSprite.visible = false
        previousSprite.alpha = 0
      }
      if (previousText && previousIndex !== null && previousIndex !== actualSceneIndex) {
        previousText.visible = false
        previousText.alpha = 0
      }
      
        // 현재 씬 표시
        if (currentSprite.parent !== containerRef.current && containerRef.current) {
          if (currentSprite.parent) {
            currentSprite.parent.removeChild(currentSprite)
          }
          containerRef.current.addChild(currentSprite)
        }
      currentSprite.visible = true
      currentSprite.alpha = 1
      
      if (currentText) {
          if (currentText.parent !== containerRef.current && containerRef.current) {
            if (currentText.parent) {
              currentText.parent.removeChild(currentText)
            }
            containerRef.current.addChild(currentText)
          }
        currentText.visible = true
        currentText.alpha = 1
      }
      
      // 렌더링은 PixiJS ticker가 처리
      
      previousSceneIndexRef.current = actualSceneIndex
      
      setTimeout(() => {
        wrappedOnComplete()
      }, 50)
      
      return
    }
    
    // 현재 씬을 컨테이너에 추가
    if (!containerRef.current) {
      console.error(`[updateCurrentScene] containerRef.current가 null - sceneIndex: ${actualSceneIndex}`)
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
      // 렌더링은 PixiJS ticker가 처리
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
      if (idx !== actualSceneIndex) {
        sprite.visible = false
        sprite.alpha = 0
      }
    })
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 텍스트는 건드리지 않음
    if (!isManualSceneSelectRef.current) {
      textsRef.current.forEach((text, idx) => {
        if (text && idx !== actualSceneIndex) {
          text.visible = false
          text.alpha = 0
        }
      })
    }
    
    // 현재 씬 visible 설정 및 alpha 초기화
    // 같은 그룹 내 씬이 아닌 경우에만 alpha를 0으로 설정 (전환 효과를 위해)
    if (!isInSameGroup) {
      spriteToUse.visible = true
      spriteToUse.alpha = 0
    }
    // 같은 그룹 내 씬인 경우는 위에서 이미 설정했으므로 여기서는 건드리지 않음
    
    // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 건드리지 않음
    if (currentText && !isManualSceneSelectRef.current) {
      currentText.visible = true
      currentText.alpha = 0
    }
    
    // 스프라이트가 컨테이너에 있는지 확인
    if (!spriteToUse.parent && containerRef.current) {
      containerRef.current.addChild(spriteToUse)
    }
    if (currentText && !currentText.parent && containerRef.current) {
      containerRef.current.addChild(currentText)
    }

    // 전환 효과 적용 전에 한 번 렌더링
    // 렌더링은 PixiJS ticker가 처리
    
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
    // 같은 그룹 내 씬인 경우: 같은 이미지와 전환 효과를 공유하고 자막만 변경
    console.log(`[updateCurrentScene] 그룹 확인 | 씬 ${actualSceneIndex}, isInSameGroup: ${isInSameGroup}, isFirstSceneInGroup: ${isFirstSceneInGroup}, partIndex: ${partIndex}`)
    if (isInSameGroup && !isFirstSceneInGroup) {
      // 같은 그룹 내 씬: 이미지와 전환 효과는 첫 번째 씬에서 이미 적용됨, 자막만 변경
      
      // 같은 그룹 내 씬 전환 시 실제로 표시되고 있는 텍스트 객체 찾기
      // handleScenePartSelect에서 이미 업데이트한 텍스트 객체를 우선 찾기
      let textToUpdate = currentText
      
      // currentText가 null이면 같은 그룹 내 첫 번째 씬의 텍스트 객체를 사용
      if (!textToUpdate && firstSceneIndex >= 0) {
        textToUpdate = textsRef.current.get(firstSceneIndex) || undefined
      }
      
      if (currentScene.sceneId !== undefined) {
        // 디버그 ID가 있는 객체를 먼저 찾기 (handleScenePartSelect에서 업데이트한 객체)
        // 같은 씬 내 구간 전환 시 sceneId 조건 없이도 찾을 수 있도록 개선
        let textWithDebugId: PIXI.Text | null = null
        let maxDebugId: string = ''
        textsRef.current.forEach((text, idx) => {
          if (text) {
            const textScene = timeline.scenes[idx]
            const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
            const matchesSceneId = textScene?.sceneId === currentScene.sceneId
            const matchesIndex = idx === actualSceneIndex
            // 같은 씬 내 구간 전환 시 sceneId 조건 없이도 찾을 수 있도록 개선
            // 같은 씬 인덱스이거나 같은 sceneId를 가진 경우
            if (matchesIndex || matchesSceneId) {
              if (debugId && debugId.startsWith('text_')) {
                if (debugId > maxDebugId) {
                  maxDebugId = debugId
                  textWithDebugId = text
                }
              }
            }
          }
        })
        
        if (textWithDebugId !== null) {
          textToUpdate = textWithDebugId
        } else {
          // 디버그 ID가 없으면 실제로 표시되고 있는 텍스트 객체 찾기 (visible=true, alpha>0)
          let visibleText: PIXI.Text | null = null
          textsRef.current.forEach((text, idx) => {
            if (text && text.visible && text.alpha > 0) {
              const textScene = timeline.scenes[idx]
              if (textScene?.sceneId === currentScene.sceneId || idx === actualSceneIndex) {
                visibleText = text
              }
            }
          })
          
          if (visibleText) {
            textToUpdate = visibleText
          } else if (firstSceneIndex >= 0) {
            // 같은 그룹 내 첫 번째 씬의 텍스트 객체 사용
            const firstText = textsRef.current.get(firstSceneIndex)
            if (firstText) {
              textToUpdate = firstText
            }
          }
        }
      }
      
      // textToUpdate가 여전히 null이면 currentText 또는 첫 번째 씬의 텍스트 객체 사용
      if (!textToUpdate) {
        if (currentText) {
          textToUpdate = currentText
        } else if (firstSceneIndex >= 0) {
          textToUpdate = textsRef.current.get(firstSceneIndex) || undefined
        }
      }
      
      // 자막 내용이 수정되었을 수 있으므로 텍스트 내용 업데이트
      // handleScenePartSelect에서 이미 텍스트 객체를 업데이트했을 수 있으므로, 
      // 디버그 ID가 있는 텍스트 객체의 텍스트를 우선 사용
      // 재생 중일 때는 텍스트를 전혀 건드리지 않음 (renderSubtitlePart에서 처리)
      // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 건드리지 않음
      console.log(`[updateCurrentScene] 텍스트 업데이트 조건 확인 | 씬 ${actualSceneIndex}, textToUpdate: ${!!textToUpdate}, isPlaying: ${isPlaying}, partIndex: ${partIndex}, isManualSceneSelect: ${isManualSceneSelectRef.current}`)
      // 자막 렌더링은 renderSubtitlePart가 담당하므로 여기서는 처리하지 않음
      // renderSceneContent의 onComplete에서 renderSubtitlePart 호출
      
      // isManualSceneSelectRef가 true이면 텍스트를 전혀 건드리지 않음
      if (!isManualSceneSelectRef.current) {
        // 이전 텍스트 숨기기 (새 텍스트를 보여준 후)
        if (previousText && previousIndex !== null && previousIndex !== actualSceneIndex) {
          previousText.visible = false
          previousText.alpha = 0
        }
        
        // 이미지는 이미 표시되어 있으므로 그대로 유지 (전환 효과 적용 안 함)
        // 텍스트만 변경하고 렌더링
        // textToUpdate가 업데이트되었는지 확인하고 렌더링
        if (textToUpdate && appRef.current) {
          // 텍스트 객체가 컨테이너에 있는지 확인
          if (textToUpdate.parent !== containerRef.current) {
            if (textToUpdate.parent) {
              textToUpdate.parent.removeChild(textToUpdate)
            }
            containerRef.current.addChild(textToUpdate)
          }
          // 렌더링은 PixiJS ticker가 처리
        } else if (appRef.current) {
          // 렌더링은 PixiJS ticker가 처리
        }
      }
      
      // 전환 효과는 적용하지 않음 (첫 번째 씬에서 이미 적용됨)
      // 완료 콜백만 호출
      previousSceneIndexRef.current = actualSceneIndex
      if (wrappedOnComplete) {
        wrappedOnComplete()
      }
    } else {
      // 첫 번째 씬이거나 다른 그룹: 전환 효과 적용
      
      // 자막 렌더링은 renderSubtitlePart가 담당하므로 여기서는 처리하지 않음
      // renderSceneContent의 onComplete에서 renderSubtitlePart 호출
      
      // applyEnterEffect 호출 전에 currentText 객체의 상태를 로깅
      
      applyEnterEffect(
        spriteToUse,
        currentText || null,
        transition,
        transitionDuration,
        width,
        height,
        actualSceneIndex,
        forceTransition,
        () => {
          previousSceneIndexRef.current = actualSceneIndex
          wrappedOnComplete()
        },
        previousIndex,
        isFirstInGroup ? groupTransitionTimelinesRef : undefined,
        currentScene.sceneId,
        isPlaying // 재생 중인지 여부 전달
      )
    }
    
    if (!currentSprite) {
      // 스프라이트가 없으면 즉시 표시
      spritesRef.current.forEach((sprite, index) => {
        if (sprite?.parent) {
          sprite.visible = index === actualSceneIndex
          sprite.alpha = index === actualSceneIndex ? 1 : 0
        }
      })
      // isManualSceneSelectRef가 true이면 renderSubtitlePart에서 이미 자막을 업데이트했으므로 건드리지 않음
      if (!isManualSceneSelectRef.current) {
        textsRef.current.forEach((text, index) => {
          if (text?.parent) {
            text.visible = index === actualSceneIndex
            text.alpha = index === actualSceneIndex ? 1 : 0
          }
        })
      }

      // 렌더링은 PixiJS ticker가 처리
      previousSceneIndexRef.current = actualSceneIndex
    }
  }
  }, [timeline, stageDimensions, applyEnterEffect, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, previousSceneIndexRef, activeAnimationsRef, isManualSceneSelectRef, handleSkipAnimation])

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
    // textsRef를 clear하기 전에 기존 텍스트 객체의 __debugId와 텍스트 내용을 저장
    const savedTextData = new Map<number, { debugId?: string, text: string }>()
    textsRef.current.forEach((text, idx) => {
      if (text) {
        const debugId = (text as PIXI.Text & { __debugId?: string }).__debugId
        savedTextData.set(idx, {
          debugId: debugId || undefined,
          text: text.text || ''
        })
      }
    })
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

          // ||| 구분자 제거: 첫 번째 구간만 표시하거나 구분자를 공백으로 대체
          const textContent = scene.text.content.split(/\s*\|\|\|\s*/).map(part => part.trim()).filter(part => part.length > 0)
          const displayText = textContent.length > 0 ? textContent[0] : scene.text.content

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
            text: displayText,
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
          // 기존 텍스트 객체의 __debugId와 텍스트 내용을 복원
          const savedData = savedTextData.get(sceneIndex)
          if (savedData) {
            if (savedData.debugId && savedData.debugId.startsWith('text_')) {
              ;(text as PIXI.Text & { __debugId?: string }).__debugId = savedData.debugId
              // 수동 업데이트된 텍스트인 경우 텍스트 내용도 복원
              if (savedData.text && savedData.text !== '와 대박!') {
                text.text = savedData.text
              }
            }
          }
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
        // 렌더링은 PixiJS ticker가 처리
      } else {
        // 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
        const scene = timeline.scenes[sceneIndex]
        let partIndex: number | null = null
        if (scene?.text?.content) {
          const scriptParts = splitSubtitleByDelimiter(scene.text.content)
          if (scriptParts.length > 1) {
            // 구간이 있으면 첫 번째 구간(0)만 표시
            partIndex = 0
            console.log(`[loadAllScenes] 구간이 있으므로 첫 번째 구간(0)만 표시 | 씬 ${sceneIndex}, 구간 수: ${scriptParts.length}`)
          } else {
            // 구간이 없으면 전체 자막 표시
            partIndex = null
            console.log(`[loadAllScenes] 구간이 없으므로 전체 자막 표시 | 씬 ${sceneIndex}`)
          }
        }
        updateCurrentScene(true, undefined, undefined, undefined, false, undefined, partIndex, sceneIndex)
      }
      // 렌더링은 PixiJS ticker가 처리
      
      if (onLoadComplete) {
        onLoadComplete(sceneIndex)
      }
    })
  }, [timeline, stageDimensions, updateCurrentScene, appRef, containerRef, spritesRef, textsRef, currentSceneIndexRef, isSavingTransformRef, loadPixiTextureWithCache, onLoadComplete])

  // 이미지만 렌더링하는 함수
  const renderSceneImage = useCallback((
    sceneIndex: number,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      prepareOnly?: boolean // alpha: 0으로 준비만 하고 표시하지 않음
    }
  ) => {
    if (!timeline || !appRef.current || !containerRef.current) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    const {
      skipAnimation = false,
      forceTransition,
      previousIndex,
      onComplete,
      prepareOnly = false,
    } = options || {}
    
    const currentSprite = spritesRef.current.get(sceneIndex)
    if (!currentSprite) return
    
    const previousSprite = previousIndex !== null && previousIndex !== undefined ? spritesRef.current.get(previousIndex) : null
    
    // 이전 씬 숨기기
    if (previousSprite && previousIndex !== null && previousIndex !== sceneIndex) {
      previousSprite.visible = false
      previousSprite.alpha = 0
    }
    
    // 현재 씬 스프라이트를 컨테이너에 추가
    if (currentSprite.parent !== containerRef.current) {
      if (currentSprite.parent) {
        currentSprite.parent.removeChild(currentSprite)
      }
      containerRef.current.addChild(currentSprite)
    }
    
    const prevSpriteAlpha = currentSprite.alpha
    const prevSpriteVisible = currentSprite.visible
    
    if (prepareOnly) {
      // 준비만: alpha: 0으로 설정
      currentSprite.visible = true
      currentSprite.alpha = 0
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 전환 효과 적용
    if (skipAnimation || forceTransition === 'none') {
      // 애니메이션 없이 즉시 표시
      console.log(`[renderSceneImage] 씬 ${sceneIndex} 즉시 표시 (skipAnimation: ${skipAnimation}, forceTransition: ${forceTransition})`)
      currentSprite.visible = true
      currentSprite.alpha = 1
    } else {
      // 전환 효과 적용
      console.log(`[renderSceneImage] 씬 ${sceneIndex} 전환 효과 적용 (forceTransition: ${forceTransition}, previousIndex: ${previousIndex})`)
      // 전환 효과 적용 (이미지만)
      // updateCurrentScene을 사용하되, 텍스트는 처리하지 않음
      // 임시로 currentSceneIndexRef를 설정하여 updateCurrentScene이 올바른 씬을 처리하도록 함
      const originalSceneIndex = currentSceneIndexRef.current
      currentSceneIndexRef.current = sceneIndex
      
      // 구간이 있어도 전체 자막 표시 (partIndex: null로 설정하여 isSameSceneTransition 조건에 걸리지 않도록 함)
      const partIndex = null
      
      // updateCurrentScene 호출 (이미지만 처리)
      updateCurrentScene(
        false,
        previousIndex !== undefined ? previousIndex : originalSceneIndex,
        forceTransition,
        () => {
          // 텍스트는 처리하지 않으므로 스프라이트만 확인
          const finalSprite = spritesRef.current.get(sceneIndex)
          if (finalSprite) {
            finalSprite.visible = true
            finalSprite.alpha = 1
          }
          if (onComplete) {
            onComplete()
          }
        },
        false, // isPlaying
        undefined, // skipImage
        partIndex // 현재 씬의 첫 번째 구간 인덱스 전달
      )
      return
    }
    
    // 깜빡임 확인: 값이 변경되었거나 반복 호출되는지 확인
    const spriteAlphaChanged = prevSpriteAlpha !== currentSprite.alpha
    const spriteVisibleChanged = prevSpriteVisible !== currentSprite.visible
    if (spriteAlphaChanged || spriteVisibleChanged) {
      console.log(`[렌더링-이미지] 씬${sceneIndex} | alpha: ${prevSpriteAlpha}→${currentSprite.alpha} | visible: ${prevSpriteVisible}→${currentSprite.visible}`)
    } else {
      console.warn(`[렌더링-이미지] 씬${sceneIndex} 중복호출 감지! (값 변경 없음) | alpha: ${currentSprite.alpha}, visible: ${currentSprite.visible}`)
    }
    
    if (onComplete) {
      onComplete()
    }
  }, [
    timeline,
    appRef,
    containerRef,
    spritesRef,
    stageDimensions,
    updateCurrentScene,
    currentSceneIndexRef,
  ])

  // 자막만 렌더링하는 함수
  // partIndex가 null이면 전체 자막 렌더링
  const renderSubtitlePart = useCallback((
    sceneIndex: number,
    partIndex: number | null,
    options?: {
      skipAnimation?: boolean
      onComplete?: () => void
      prepareOnly?: boolean // alpha: 0으로 준비만 하고 표시하지 않음
    }
  ) => {
    if (!timeline || !appRef.current) {
      console.warn(`[renderSubtitlePart] timeline 또는 appRef가 없습니다.`)
      return
    }
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) {
      console.warn(`[renderSubtitlePart] 씬 ${sceneIndex}을 찾을 수 없습니다. (총 ${timeline.scenes.length}개 씬)`)
      return
    }
    
    const {
      skipAnimation = false,
      onComplete,
      prepareOnly = false,
    } = options || {}
    
    // 원본 텍스트에서 구간 추출
    const originalText = scene.text?.content || ''
    console.log(`[renderSubtitlePart] 원본 텍스트 확인 | 씬 ${sceneIndex}, 원본 길이: ${originalText.length}, 원본: "${originalText.substring(0, 100)}..."`)
    
    // 구간 분할 확인
    const scriptParts = splitSubtitleByDelimiter(originalText)
    const hasSegments = scriptParts.length > 1
    
    // partIndex가 null이면 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 표시
    let partText: string | null = null
    if (partIndex === null) {
      if (hasSegments) {
        // 구간이 있으면 첫 번째 구간만 표시
        partText = scriptParts[0]?.trim() || originalText
        console.log(`[renderSubtitlePart] partIndex가 null이고 구간이 있으므로 첫 번째 구간만 표시 | 텍스트: "${partText.substring(0, 50)}..."`)
      } else {
        // 구간이 없으면 전체 자막 표시
        partText = originalText
        console.log(`[renderSubtitlePart] partIndex가 null이고 구간이 없으므로 전체 자막 표시`)
      }
    } else {
      if (partIndex >= 0 && partIndex < scriptParts.length) {
        partText = scriptParts[partIndex]?.trim() || null
      } else {
        console.warn(`[renderSubtitlePart] partIndex ${partIndex}가 범위를 벗어났습니다. (0~${scriptParts.length - 1})`)
        // 범위를 벗어났을 때 fallback: 첫 번째 구간 사용 또는 전체 텍스트 사용
        if (scriptParts.length > 0) {
          partText = scriptParts[0]?.trim() || null
          console.warn(`[renderSubtitlePart] fallback: 첫 번째 구간 사용 | 텍스트: "${partText?.substring(0, 50) || '없음'}..."`)
        } else {
          partText = originalText
          console.warn(`[renderSubtitlePart] fallback: 전체 텍스트 사용`)
        }
      }
    }
    
    
    if (!partText) {
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 텍스트 객체 찾기
    // 같은 그룹 내 씬들은 같은 텍스트 객체를 공유하므로, 항상 같은 그룹 내 첫 번째 씬의 텍스트 사용
    let targetTextObj: PIXI.Text | null = null
    const sceneId = scene.sceneId
    if (sceneId !== undefined) {
      // 같은 그룹 내 첫 번째 씬 찾기
      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
      if (firstSceneIndexInGroup >= 0) {
        targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
      }
    }
    
    // 같은 그룹이 아니거나 첫 번째 씬의 텍스트를 찾지 못한 경우, 현재 씬의 텍스트 사용
    if (!targetTextObj) {
      targetTextObj = textsRef.current.get(sceneIndex) || null
      console.log(`[renderSubtitlePart] 현재 씬(${sceneIndex})의 텍스트 객체 찾기: ${!!targetTextObj}`)
    }
    
    // 텍스트 객체를 찾지 못한 경우, 모든 텍스트 객체를 검색하여 찾기
    if (!targetTextObj) {
      console.warn(`[renderSubtitlePart] 텍스트 객체를 찾지 못했습니다. 모든 텍스트 객체 검색 중...`)
      console.log(`[renderSubtitlePart] textsRef.current 크기: ${textsRef.current.size}, 씬 수: ${timeline.scenes.length}`)
      
      // textsRef에 있는 모든 텍스트 객체 로깅
      textsRef.current.forEach((text, idx) => {
        console.log(`[renderSubtitlePart] textsRef[${idx}]: ${text ? '있음' : '없음'}`)
      })
      
      // 같은 sceneId를 가진 씬들의 텍스트 객체 검색
      if (sceneId !== undefined) {
        timeline.scenes.forEach((s, idx) => {
          if (s.sceneId === sceneId && !targetTextObj) {
            const text = textsRef.current.get(idx)
            if (text) {
              targetTextObj = text
              console.log(`[renderSubtitlePart] 같은 그룹 내 씬 ${idx}의 텍스트 객체 발견`)
            }
          }
        })
      }
      
      // 여전히 찾지 못한 경우, 모든 텍스트 객체 검색 (인덱스 순서대로)
      if (!targetTextObj) {
        for (let i = 0; i < timeline.scenes.length; i++) {
          const text = textsRef.current.get(i)
          if (text) {
            targetTextObj = text
            console.log(`[renderSubtitlePart] 씬 ${i}의 텍스트 객체를 대체로 사용`)
            break
          }
        }
      }
      
      // 여전히 찾지 못한 경우, 컨테이너에서 직접 찾기
      if (!targetTextObj && containerRef.current) {
        console.warn(`[renderSubtitlePart] 컨테이너에서 텍스트 객체 검색 중...`)
        containerRef.current.children.forEach((child, idx) => {
          if (child instanceof PIXI.Text && !targetTextObj) {
            targetTextObj = child
            console.log(`[renderSubtitlePart] 컨테이너의 ${idx}번째 자식에서 텍스트 객체 발견`)
          }
        })
      }
    }
    
    if (!targetTextObj) {
      console.error(`[renderSubtitlePart] 텍스트 객체를 찾을 수 없습니다. 씬 ${sceneIndex}, partIndex: ${partIndex}`)
      console.error(`[renderSubtitlePart] textsRef.current 크기: ${textsRef.current.size}, 컨테이너 자식 수: ${containerRef.current?.children.length || 0}`)
      // 텍스트 객체가 없으면 onComplete만 호출하고 종료
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 텍스트 객체가 컨테이너에 추가되어 있는지 확인하고, 없으면 추가
    // 항상 컨테이너에 추가하여 렌더링 보장
    if (containerRef.current) {
      if (targetTextObj.parent !== containerRef.current) {
        console.log(`[renderSubtitlePart] 텍스트 객체를 컨테이너에 추가 중... (parent: ${targetTextObj.parent ? '있음' : '없음'})`)
        if (targetTextObj.parent) {
          targetTextObj.parent.removeChild(targetTextObj)
        }
        containerRef.current.addChild(targetTextObj)
      }
      
      // z-index를 최상위로 설정하여 다른 객체 위에 표시되도록 함
      containerRef.current.setChildIndex(targetTextObj, containerRef.current.children.length - 1)
    }
    
    // 텍스트 업데이트
    const prevAlpha = targetTextObj.alpha
    const prevVisible = targetTextObj.visible
    const prevText = targetTextObj.text
    targetTextObj.text = partText
    
    if (prepareOnly) {
      // 준비만: alpha: 0으로 설정
      targetTextObj.visible = true
      targetTextObj.alpha = 0
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 표시
    if (skipAnimation) {
      // 즉시 표시
      targetTextObj.visible = true
      targetTextObj.alpha = 1
    } else {
      // 페이드 인 효과 (선택적)
      targetTextObj.visible = true
      targetTextObj.alpha = 1
    }
    
    // 텍스트 객체가 컨테이너에 있는지 다시 확인 (중요: 렌더링을 위해 필수)
    if (containerRef.current && targetTextObj.parent !== containerRef.current) {
      console.warn(`[renderSubtitlePart] 텍스트 객체가 컨테이너에서 제거됨! 다시 추가 중...`)
      if (targetTextObj.parent) {
        targetTextObj.parent.removeChild(targetTextObj)
      }
      containerRef.current.addChild(targetTextObj)
      // z-index를 최상위로 설정
      containerRef.current.setChildIndex(targetTextObj, containerRef.current.children.length - 1)
    }
    
    // 깜빡임 확인: 값이 변경되었거나 반복 호출되는지 확인
    const alphaChanged = prevAlpha !== targetTextObj.alpha
    const visibleChanged = prevVisible !== targetTextObj.visible
    const textChanged = prevText !== targetTextObj.text
    if (alphaChanged || visibleChanged || textChanged) {
      console.log(`[렌더링-자막] 씬${sceneIndex} 구간${partIndex} | alpha: ${prevAlpha}→${targetTextObj.alpha} | visible: ${prevVisible}→${targetTextObj.visible} | text변경: ${textChanged} | "${partText.substring(0, 20)}..."`)
    } else {
      // 중복 호출이지만 값이 변경되지 않았으므로 조용히 무시 (경고 제거)
      // updateCurrentScene과 renderSubtitlePart가 모두 호출될 수 있으므로 정상적인 동작일 수 있음
    }
    
    // 자막이 제대로 렌더링되었는지 최종 확인
    if (targetTextObj.visible && targetTextObj.alpha > 0 && targetTextObj.text === partText) {
      console.log(`[renderSubtitlePart] 자막 렌더링 완료 확인 | 씬 ${sceneIndex}, 구간 ${partIndex}, visible: ${targetTextObj.visible}, alpha: ${targetTextObj.alpha}, text: "${partText.substring(0, 20)}..."`)
    } else {
      console.warn(`[renderSubtitlePart] 자막 렌더링 확인 실패 | 씬 ${sceneIndex}, 구간 ${partIndex}, visible: ${targetTextObj.visible}, alpha: ${targetTextObj.alpha}, text일치: ${targetTextObj.text === partText}`)
      // 다시 시도
      targetTextObj.text = partText
      targetTextObj.visible = true
      targetTextObj.alpha = 1
    }
    
    
    if (onComplete) {
      onComplete()
    }
  }, [
    timeline,
    appRef,
    containerRef,
    textsRef,
  ])
  
  // renderSubtitlePart를 ref에 저장 (handleSkipAnimation에서 사용)
  useEffect(() => {
    renderSubtitlePartRef.current = renderSubtitlePart
  }, [renderSubtitlePart])

  // 이미지와 자막을 동시에 alpha: 0으로 준비하는 함수
  const prepareImageAndSubtitle = useCallback((
    sceneIndex: number,
    partIndex: number = 0,
    options?: {
      onComplete?: () => void
    }
  ) => {
    if (!timeline || !appRef.current) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    const { onComplete } = options || {}
    
    // 이미지 준비
    const currentSprite = spritesRef.current.get(sceneIndex)
    if (currentSprite && containerRef.current) {
      if (currentSprite.parent !== containerRef.current) {
        if (currentSprite.parent) {
          currentSprite.parent.removeChild(currentSprite)
        }
        containerRef.current.addChild(currentSprite)
      }
      currentSprite.visible = true
      currentSprite.alpha = 0
    }
    
    // 자막 준비
    const originalText = scene.text?.content || ''
    const scriptParts = splitSubtitleByDelimiter(originalText)
    const partText = scriptParts[partIndex]?.trim() || null
    
    if (partText) {
      let targetTextObj: PIXI.Text | null = textsRef.current.get(sceneIndex) || null
      
      // 같은 그룹 내 첫 번째 씬의 텍스트 사용 (필요한 경우)
      if (!targetTextObj || (!targetTextObj.visible && targetTextObj.alpha === 0)) {
        const sceneId = scene.sceneId
        if (sceneId !== undefined) {
          const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
          if (firstSceneIndexInGroup >= 0) {
            targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
          }
        }
      }
      
      if (targetTextObj) {
        targetTextObj.text = partText
        targetTextObj.visible = true
        targetTextObj.alpha = 0
      }
    }
    
    if (onComplete) {
      onComplete()
    }
  }, [
    timeline,
    appRef,
    containerRef,
    spritesRef,
    textsRef,
  ])

  // 통합 렌더링 함수: 모든 canvas 렌더링 경로를 통합 (재생 중/비재생 중 모두 사용)
  // 다른 함수들(renderSceneImage, renderSubtitlePart 등)의 영향을 받지 않고 독립적으로 동작
  const renderSceneContent = useCallback((
    sceneIndex: number,
    partIndex?: number | null,
    options?: {
      skipAnimation?: boolean
      forceTransition?: string
      previousIndex?: number | null
      onComplete?: () => void
      updateTimeline?: boolean
      prepareOnly?: boolean // alpha: 0으로 준비만 하고 표시하지 않음 (재생 중 사용)
      isPlaying?: boolean // 재생 중인지 여부 (updateCurrentScene에 전달)
      skipImage?: boolean // 이미지 렌더링 스킵 (전환 효과와 자막만 렌더링)
    }
  ) => {
    if (!timeline || !appRef.current) return
    
    const scene = timeline.scenes[sceneIndex]
    if (!scene) return
    
    const {
      skipAnimation = false,
      forceTransition,
      previousIndex,
      onComplete,
      updateTimeline = false, // 재생 중에는 timeline 업데이트 안함 (다른 함수 영향 방지)
      prepareOnly = false,
      isPlaying = false, // 재생 중인지 여부
      skipImage = false, // 이미지 렌더링 스킵 (전환 효과와 자막만 렌더링)
    } = options || {}
    
    // 구간 인덱스가 있으면 해당 구간의 텍스트 추출
    let partText: string | null = null
    const originalText = scene.text?.content || ''
    const scriptParts = splitSubtitleByDelimiter(originalText)
    const hasSegments = scriptParts.length > 1
    
    if (partIndex !== undefined && partIndex !== null) {
      // partIndex가 있으면 해당 구간 사용
      if (scriptParts.length > 0) {
        partText = scriptParts[partIndex]?.trim() || scriptParts[0] || originalText
      } else {
        partText = originalText
      }
      console.log(`[renderSceneContent] 구간 추출 | 씬 ${sceneIndex}, partIndex: ${partIndex}, 원본: "${originalText.substring(0, 50)}...", 추출된 텍스트: "${partText.substring(0, 50)}...", updateCurrentScene에 partIndex 전달 예정`)
    } else {
      // partIndex가 없으면 구간이 있으면 첫 번째 구간만 사용, 없으면 전체 텍스트 사용
      if (hasSegments) {
        partText = scriptParts[0]?.trim() || originalText
        console.log(`[renderSceneContent] partIndex가 null이고 구간이 있으므로 첫 번째 구간만 사용 | 씬 ${sceneIndex}, 텍스트: "${partText.substring(0, 50)}..."`)
      } else {
        partText = originalText
        console.log(`[renderSceneContent] partIndex가 null이고 구간이 없으므로 전체 텍스트 사용 | 씬 ${sceneIndex}, 텍스트: "${partText?.substring(0, 50) || '없음'}..."`)
      }
    }
    
    // timeline 업데이트 (필요한 경우만, 재생 중에는 안함)
    if (updateTimeline && partText && setTimeline) {
      const updatedTimeline = {
        ...timeline,
        scenes: timeline.scenes.map((s, i) =>
          i === sceneIndex
            ? {
                ...s,
                text: {
                  ...s.text,
                  content: partText,
                },
              }
            : s
        ),
      }
      setTimeline(updatedTimeline)
    }
    
    // 텍스트 객체 찾기
    // 같은 그룹 내 씬들은 같은 텍스트 객체를 공유하므로, 항상 같은 그룹 내 첫 번째 씬의 텍스트 사용
    let targetTextObj: PIXI.Text | null = null
    const sceneId = scene.sceneId
    if (sceneId !== undefined) {
      // 같은 그룹 내 첫 번째 씬 찾기
      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
      if (firstSceneIndexInGroup >= 0) {
        targetTextObj = textsRef.current.get(firstSceneIndexInGroup) || null
        console.log(`[renderSceneContent] 같은 그룹 내 첫 번째 씬(${firstSceneIndexInGroup})의 텍스트 객체 사용 | 씬 ${sceneIndex}, 구간 ${partIndex}`)
      }
    }
    
    // 같은 그룹이 아니거나 첫 번째 씬의 텍스트를 찾지 못한 경우, 현재 씬의 텍스트 사용
    if (!targetTextObj) {
      targetTextObj = textsRef.current.get(sceneIndex) || null
    }
    
    // 스프라이트 찾기
    const currentSprite = spritesRef.current.get(sceneIndex)
    
    // 같은 그룹 내 첫 번째 씬의 스프라이트 사용 (필요한 경우)
    let spriteToUse = currentSprite
    if (scene.sceneId !== undefined) {
      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === scene.sceneId)
      if (firstSceneIndexInGroup >= 0 && firstSceneIndexInGroup !== sceneIndex) {
        const firstSprite = spritesRef.current.get(firstSceneIndexInGroup)
        if (firstSprite) {
          spriteToUse = firstSprite
        }
      }
    }
    
    // prepareOnly 모드: alpha: 0으로 준비만 (재생 중 사용)
    if (prepareOnly) {
      // 이미지 준비
      if (spriteToUse && containerRef.current) {
        if (spriteToUse.parent !== containerRef.current) {
          if (spriteToUse.parent) {
            spriteToUse.parent.removeChild(spriteToUse)
          }
          containerRef.current.addChild(spriteToUse)
        }
        spriteToUse.visible = true
        spriteToUse.alpha = 0
      }
      
      // 자막 준비
      if (targetTextObj && partText) {
        targetTextObj.text = partText
        targetTextObj.visible = true
        targetTextObj.alpha = 0
      }
      
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 텍스트 객체 업데이트 (prepareOnly가 아닐 때)
    if (targetTextObj && partText) {
      targetTextObj.text = partText
      // 재생 중이고 첫 번째 구간일 때는 즉시 표시 (updateCurrentScene 완료 전에도 표시되도록)
      if (isPlaying && partIndex === 0) {
        targetTextObj.visible = true
        targetTextObj.alpha = 1
      }
      // visible과 alpha는 updateCurrentScene에서 처리하므로 여기서는 설정하지 않음 (재생 중 첫 번째 구간 제외)
    }
    
    // 같은 씬 내 구간 전환인지 확인
    // previousIndex가 제공되면 다른 씬으로 전환하는 것이므로 전환 효과 적용
    // previousIndex가 null이거나 제공되지 않고, partIndex가 제공되면 같은 씬 내 구간 전환
    const isSameSceneTransition = 
      currentSceneIndexRef.current === sceneIndex && 
      previousIndex === undefined && 
      partIndex !== undefined && 
      partIndex !== null &&
      partIndex > 0 // 첫 번째 구간(partIndex: 0)은 씬 전환과 함께 처리되므로 제외
    
    // 같은 씬 내 구간 전환인 경우: 자막만 업데이트 (전환 효과 없음)
    if (isSameSceneTransition) {
      if (targetTextObj && partText) {
        targetTextObj.text = partText
        targetTextObj.visible = true
        targetTextObj.alpha = 1
      }
      // 렌더링은 PixiJS ticker가 처리
      if (onComplete) {
        onComplete()
      }
      return
    }
    
    // 다른 씬으로 이동하는 경우: 씬 전환
    if (setCurrentSceneIndex) {
      currentSceneIndexRef.current = sceneIndex
      setCurrentSceneIndex(sceneIndex)
    }
    
    // updateCurrentScene 호출하여 씬 전환
    // onComplete를 onAnimationComplete로 변환 (sceneIndex를 인자로 받음)
    // 재생 중일 때는 isPlaying: true 전달하여 텍스트를 건드리지 않도록 함
    // previousIndex가 undefined이면 previousSceneIndexRef를 사용하여 전환 효과가 제대로 작동하도록 함
    // (currentSceneIndexRef.current를 사용하면 이미 같은 씬으로 설정되어 있어서 전환 효과가 스킵될 수 있음)
    const effectivePreviousIndex = previousIndex !== undefined 
      ? previousIndex 
      : (previousSceneIndexRef.current !== sceneIndex ? previousSceneIndexRef.current : null)
    console.log(`[renderSceneContent] updateCurrentScene 호출 전 | 씬 ${sceneIndex}, partIndex: ${partIndex}, isPlaying: ${isPlaying}, skipImage: ${skipImage}`)
    updateCurrentScene(
      skipAnimation,
      effectivePreviousIndex,
      forceTransition,
      () => {
        // 전환 완료 후 자막 렌더링
        // 재생 중이 아닐 때만 자막 렌더링 (재생 중에는 재생 로직에서 처리)
        if (!isPlaying) {
          if (partIndex !== undefined && partIndex !== null && renderSubtitlePart) {
            // partIndex가 있으면 해당 구간만 렌더링
            renderSubtitlePart(sceneIndex, partIndex, {
              skipAnimation: true,
              onComplete: () => {
                if (onComplete) {
                  onComplete()
                }
              },
            })
          } else if (partIndex === null || partIndex === undefined) {
            // partIndex가 null이면 구간이 있으면 첫 번째 구간만 표시, 없으면 전체 자막 렌더링
            if (renderSubtitlePart) {
              const scene = timeline.scenes[sceneIndex]
              let effectivePartIndex: number | null = null
              if (scene?.text?.content) {
                const scriptParts = splitSubtitleByDelimiter(scene.text.content)
                if (scriptParts.length > 1) {
                  // 구간이 있으면 첫 번째 구간(0)만 표시
                  effectivePartIndex = 0
                  console.log(`[renderSceneContent] partIndex가 null이고 구간이 있으므로 첫 번째 구간(0)만 표시 | 씬 ${sceneIndex}, 구간 수: ${scriptParts.length}`)
                } else {
                  // 구간이 없으면 전체 자막 표시
                  effectivePartIndex = null
                  console.log(`[renderSceneContent] partIndex가 null이고 구간이 없으므로 전체 자막 표시 | 씬 ${sceneIndex}`)
                }
              }
              
              renderSubtitlePart(sceneIndex, effectivePartIndex, {
                skipAnimation: true,
                onComplete: () => {
                  // 자막이 제대로 렌더링되었는지 확인하고 강제로 표시
                  const scene = timeline.scenes[sceneIndex]
                  if (scene) {
                    const originalText = scene.text?.content || ''
                    const scriptParts = splitSubtitleByDelimiter(originalText)
                    const displayText = scriptParts.length > 1 ? (scriptParts[0]?.trim() || originalText) : originalText
                    
                    const targetTextObj = textsRef.current.get(sceneIndex)
                    let textToCheck: PIXI.Text | null = targetTextObj || null
                    const sceneId = scene.sceneId
                    if (!textToCheck && sceneId !== undefined) {
                      const firstSceneIndexInGroup = timeline.scenes.findIndex((s) => s.sceneId === sceneId)
                      if (firstSceneIndexInGroup >= 0) {
                        textToCheck = textsRef.current.get(firstSceneIndexInGroup) || null
                      }
                    }
                    
                    if (textToCheck && displayText) {
                      // 자막 강제로 표시
                      textToCheck.text = displayText
                      textToCheck.visible = true
                      textToCheck.alpha = 1
                      console.log(`[renderSceneContent] 자막 강제 표시 완료 | 씬 ${sceneIndex}, 텍스트: "${displayText.substring(0, 30)}...", visible: ${textToCheck.visible}, alpha: ${textToCheck.alpha}`)
                    } else {
                      console.warn(`[renderSceneContent] 자막 표시 실패 | 씬 ${sceneIndex}, textToCheck: ${!!textToCheck}, displayText: "${displayText?.substring(0, 30) || '없음'}..."`)
                    }
                  }
                  
                  if (onComplete) {
                    onComplete()
                  }
                },
              })
            } else {
              if (onComplete) {
                onComplete()
              }
            }
          } else {
            if (onComplete) {
              onComplete()
            }
          }
        } else {
          // 재생 중이면 onComplete만 호출
          if (onComplete) {
            onComplete()
          }
        }
      },
      isPlaying, // 재생 중인지 여부 전달
      skipImage, // 이미지 렌더링 스킵 여부 전달
      partIndex // 구간 인덱스 전달 (updateCurrentScene에서 해당 구간만 표시)
    )
    console.log(`[renderSceneContent] updateCurrentScene 호출 후 | 씬 ${sceneIndex}, partIndex: ${partIndex}`)
  }, [
    timeline,
    appRef,
    containerRef,
    textsRef,
    spritesRef,
    currentSceneIndexRef,
    previousSceneIndexRef,
    updateCurrentScene,
    setTimeline,
    setCurrentSceneIndex,
    renderSubtitlePart, // renderSubtitlePart를 dependency에 추가
  ])

  return {
    updateCurrentScene,
    syncFabricWithScene,
    loadAllScenes,
    renderSceneContent,
    renderSceneImage,
    renderSubtitlePart,
    prepareImageAndSubtitle,
  }
}
