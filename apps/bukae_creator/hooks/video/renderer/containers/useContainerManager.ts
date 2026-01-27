/**
 * Container 관리 훅
 * 씬 Container, Transition Quad Container, 자막 Container 생성 및 관리
 */

import { useCallback, useRef, useEffect } from 'react'
import * as PIXI from 'pixi.js'

/**
 * Container 관리 훅 반환 타입
 */
export interface UseContainerManagerReturn {
  /** 씬별 Container 맵 ref */
  sceneContainersRef: React.MutableRefObject<Map<number, PIXI.Container>>
  /** Transition Quad Container ref */
  transitionQuadContainerRef: React.MutableRefObject<PIXI.Container | null>
  /** 자막 Container ref */
  subtitleContainerRef: React.MutableRefObject<PIXI.Container | null>
  /** 씬 Container 생성 */
  createSceneContainer: (sceneIndex: number) => PIXI.Container
  /** 씬 Container 가져오기 (없으면 생성) */
  getOrCreateSceneContainer: (sceneIndex: number) => PIXI.Container
  /** 씬 Container 정리 */
  cleanupSceneContainer: (sceneIndex: number) => void
}

/**
 * Container 관리 훅
 * 
 * @param appRef PixiJS Application ref
 * @param containerRef 메인 Container ref
 * @returns Container 관리 함수 및 ref들
 */
export function useContainerManager(
  appRef: React.RefObject<PIXI.Application | null>,
  containerRef: React.RefObject<PIXI.Container | null>
): UseContainerManagerReturn {
  // 씬별 독립 Container 관리 (Shader Transition을 위한 구조)
  const sceneContainersRef = useRef<Map<number, PIXI.Container>>(new Map())

  // Transition Quad를 위한 별도 Container
  const transitionQuadContainerRef = useRef<PIXI.Container | null>(null)

  // 자막 전용 Container (Transition Quad 위에 렌더링)
  const subtitleContainerRef = useRef<PIXI.Container | null>(null)

  /**
   * 씬 Container 생성
   */
  const createSceneContainer = useCallback((sceneIndex: number): PIXI.Container => {
    const container = new PIXI.Container()
    sceneContainersRef.current.set(sceneIndex, container)
    return container
  }, [])

  /**
   * 씬 Container 가져오기 (없으면 생성)
   */
  const getOrCreateSceneContainer = useCallback((sceneIndex: number): PIXI.Container => {
    let container = sceneContainersRef.current.get(sceneIndex)
    if (!container) {
      container = createSceneContainer(sceneIndex)
    }
    return container
  }, [createSceneContainer])

  /**
   * 씬 Container 정리
   */
  const cleanupSceneContainer = useCallback((sceneIndex: number): void => {
    const container = sceneContainersRef.current.get(sceneIndex)
    if (container) {
      container.destroy({ children: true })
      sceneContainersRef.current.delete(sceneIndex)
    }
  }, [])

  /**
   * Transition Quad Container 초기화
   */
  const initTransitionQuadContainer = useCallback((): void => {
    if (!appRef.current || transitionQuadContainerRef.current) {
      return
    }
    const quadContainer = new PIXI.Container()
    transitionQuadContainerRef.current = quadContainer
    // 메인 container에 추가 (나중에 Transition Quad가 렌더링될 위치)
    if (containerRef.current) {
      containerRef.current.addChild(quadContainer)
    }
  }, [appRef, containerRef])

  /**
   * 자막 Container 초기화
   */
  const initSubtitleContainer = useCallback((): void => {
    if (!appRef.current || subtitleContainerRef.current) {
      return
    }
    const subtitleContainer = new PIXI.Container()
    subtitleContainerRef.current = subtitleContainer
    // 메인 container에 추가 (Transition Quad 위에 렌더링)
    // 자막은 항상 최상위 레이어
    if (containerRef.current) {
      containerRef.current.addChild(subtitleContainer)
      // 자막 Container를 최상위로 설정
      const maxIndex = containerRef.current.children.length - 1
      containerRef.current.setChildIndex(subtitleContainer, maxIndex)
    }
  }, [appRef, containerRef])

  // Transition Quad Container 및 자막 Container 초기화 (app이 준비되면)
  useEffect(() => {
    if (appRef.current && containerRef.current) {
      initTransitionQuadContainer()
      initSubtitleContainer()
    }
  }, [appRef, containerRef, initTransitionQuadContainer, initSubtitleContainer])

  return {
    sceneContainersRef,
    transitionQuadContainerRef,
    subtitleContainerRef,
    createSceneContainer,
    getOrCreateSceneContainer,
    cleanupSceneContainer,
  }
}
