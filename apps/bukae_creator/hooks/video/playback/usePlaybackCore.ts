'use client'

import { useCallback } from 'react'
import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'

/**
 * 공통 재생 로직 훅
 * 재생 정지, 애니메이션 정리, 스프라이트/텍스트 복원 등의 공통 로직을 제공합니다.
 */
export function usePlaybackCore() {
  /**
   * 진행 중인 전환 효과 애니메이션 정리
   * [강화 기능] 그룹 전환 애니메이션도 함께 정리
   * 비활성화하려면 아래 주석 처리된 부분을 제거하고 기존 코드만 사용
   */
  const cleanupAnimations = useCallback((
    activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>,
    groupTransitionTimelinesRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>> // [강화] 추가
  ) => {
    // [강화] 일반 애니메이션 정리 (기존 로직)
    if (activeAnimationsRef) {
      activeAnimationsRef.current.forEach((tl, key) => {
        try {
          if (tl) {
            // 진행 중인 애니메이션만 kill
            if (tl.isActive()) {
              tl.kill()
            }
            // [강화] 완료된 애니메이션도 정리 (메모리 누수 방지)
            // 비활성화하려면 아래 줄 주석 처리
            tl.clear()
          }
        } catch (error) {
          console.warn(`[cleanupAnimations] Error cleaning up animation ${key}:`, error)
        }
      })
      activeAnimationsRef.current.clear()
    }
    
    // [강화] 그룹 전환 애니메이션 정리
    // 비활성화하려면 아래 블록 전체 주석 처리
    if (groupTransitionTimelinesRef) {
      groupTransitionTimelinesRef.current.forEach((tl, key) => {
        try {
          if (tl && tl.isActive()) {
            tl.kill()
          }
          tl.clear()
        } catch (error) {
          console.warn(`[cleanupAnimations] Error cleaning up group animation ${key}:`, error)
        }
      })
      groupTransitionTimelinesRef.current.clear()
    }
  }, [])

  /**
   * 특정 씬의 스프라이트와 텍스트를 alpha: 1, visible: true로 복원
   */
  const restoreSceneElements = useCallback((
    sceneIndex: number | null,
    spritesRef?: React.MutableRefObject<Map<number, PIXI.Sprite>>,
    textsRef?: React.MutableRefObject<Map<number, PIXI.Text>>
  ) => {
    if (sceneIndex === null) return
    
    if (spritesRef) {
      const sprite = spritesRef.current.get(sceneIndex)
      if (sprite) {
        sprite.alpha = 1
        sprite.visible = true
      }
    }
    
    if (textsRef) {
      const text = textsRef.current.get(sceneIndex)
      if (text) {
        text.alpha = 1
        text.visible = true
      }
    }
  }, [])

  /**
   * 재생 정지 공통 로직
   * 애니메이션 정리, 스프라이트/텍스트 복원, 오디오 정지를 수행합니다.
   */
  const stopPlayback = useCallback((options: {
    sceneIndex: number | null
    activeAnimationsRef?: React.MutableRefObject<Map<number, gsap.core.Timeline>>
    spritesRef?: React.MutableRefObject<Map<number, PIXI.Sprite>>
    textsRef?: React.MutableRefObject<Map<number, PIXI.Text>>
    stopTtsAudio: () => void
    stopBgmAudio?: () => void
  }) => {
    // 애니메이션 정리
    cleanupAnimations(options.activeAnimationsRef)
    
    // 스프라이트/텍스트 복원
    restoreSceneElements(options.sceneIndex, options.spritesRef, options.textsRef)
    
    // 오디오 정지
    options.stopTtsAudio()
    if (options.stopBgmAudio) {
      options.stopBgmAudio()
    }
  }, [cleanupAnimations, restoreSceneElements])

  return {
    cleanupAnimations,
    restoreSceneElements,
    stopPlayback,
  }
}
