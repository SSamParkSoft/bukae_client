'use client'

import { useRef, useEffect, useMemo } from 'react'
import type { TimelineData, TimelineScene } from '@/store/useVideoCreateStore'
import type * as PIXI from 'pixi.js'

interface UseSceneLoaderParams {
  // PixiJS refs
  pixiReady: boolean
  appRef: React.RefObject<PIXI.Application>
  containerRef: React.RefObject<PIXI.Container>
  timelineRef: React.RefObject<TimelineData | null>
  
  // Scene loading
  loadAllScenesStable: () => Promise<void>
  isSavingTransformRef: React.MutableRefObject<boolean>
  isManualSceneSelectRef: React.MutableRefObject<boolean>
  
  // Scene data refs
  spritesRef: React.MutableRefObject<Map<number, PIXI.Sprite>>
  textsRef: React.MutableRefObject<Map<number, PIXI.Text>>
  currentSceneIndexRef: React.MutableRefObject<number>
  
  // Edit handles refs
  editHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  textEditHandlesRef: React.MutableRefObject<Map<number, PIXI.Graphics>>
  editModeRef: React.MutableRefObject<'none' | 'image' | 'text'>
  
  // Edit handler function refs
  drawEditHandlesRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveImageTransformRef: React.MutableRefObject<() => void>
  setupSpriteDragRef: React.MutableRefObject<(sprite: PIXI.Sprite, sceneIndex: number) => void>
  drawTextEditHandlesRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number, handleResize: (handle: string, deltaX: number, deltaY: number) => void, saveTransform: () => void) => void>
  handleTextResizeRef: React.MutableRefObject<(handle: string, deltaX: number, deltaY: number) => void>
  saveTextTransformRef: React.MutableRefObject<() => void>
  setupTextDragRef: React.MutableRefObject<(text: PIXI.Text, sceneIndex: number) => void>
  
  // Playback refs
  isPlayingRef: React.MutableRefObject<boolean>
  lastRenderedSceneIndexRef: React.MutableRefObject<number>
  previousSceneIndexRef: React.MutableRefObject<number>
  
  // Fabric sync
  syncFabricWithScene: () => void
  fabricReady: boolean
  editMode: 'none' | 'image' | 'text'
  
  // Timeline
  timeline: TimelineData | null
}

export function useSceneLoader({
  pixiReady,
  appRef,
  containerRef,
  timelineRef,
  loadAllScenesStable,
  isSavingTransformRef,
  isManualSceneSelectRef,
  spritesRef,
  textsRef,
  currentSceneIndexRef,
  editHandlesRef,
  textEditHandlesRef,
  editModeRef,
  drawEditHandlesRef,
  handleResizeRef,
  saveImageTransformRef,
  setupSpriteDragRef,
  drawTextEditHandlesRef,
  handleTextResizeRef,
  saveTextTransformRef,
  setupTextDragRef,
  isPlayingRef,
  lastRenderedSceneIndexRef,
  previousSceneIndexRef,
  syncFabricWithScene,
  fabricReady,
  editMode,
  timeline,
}: UseSceneLoaderParams) {
  // timeline의 scenes 배열 길이나 구조가 변경될 때만 loadAllScenes 호출
  const timelineScenesLengthRef = useRef<number>(0)
  const timelineScenesRef = useRef<TimelineScene[]>([])
  const loadAllScenesCompletedRef = useRef<boolean>(false) // loadAllScenes 완료 여부 추적

  // scenes의 실제 변경사항만 감지하는 key 생성 (timeline 객체 참조 변경 무시)
  const timelineScenesKey = useMemo(() => {
    if (!timeline || !timeline.scenes || timeline.scenes.length === 0) return ''
    return timeline.scenes.map(s => 
      `${s.sceneId}-${s.image}-${s.text?.content || ''}-${s.duration}-${s.transition || 'none'}`
    ).join('|')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline?.scenes])

  // Pixi와 타임라인이 모두 준비되면 씬 로드
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!pixiReady || !appRef.current || !containerRef.current || !currentTimeline || currentTimeline.scenes.length === 0 || !loadAllScenesStable) {
      return
    }
    
    // Transform 저장 중일 때는 loadAllScenes를 호출하지 않음
    if (isSavingTransformRef.current) {
      return
    }
    
    // 수동 씬 선택 중일 때는 loadAllScenes를 호출하지 않음 (handleScenePartSelect가 처리 중)
    if (isManualSceneSelectRef.current) {
      return
    }

    // scenes 배열의 길이나 구조가 변경되었는지 확인 (Transform만 변경된 경우는 제외)
    const scenesLength = currentTimeline.scenes.length
    const scenesChanged = timelineScenesLengthRef.current !== scenesLength || 
      currentTimeline.scenes.some((scene, i) => {
        const prevScene = timelineScenesRef.current[i]
        if (!prevScene) return true
        // 이미지나 텍스트 내용이 변경되었는지 확인 (Transform 제외)
        return prevScene.image !== scene.image || 
               prevScene.text?.content !== scene.text?.content ||
               prevScene.text?.position !== scene.text?.position ||
               prevScene.duration !== scene.duration ||
               prevScene.transition !== scene.transition
      })

    if (!scenesChanged && timelineScenesLengthRef.current > 0) {
      return
    }

    // scenes 정보 업데이트
    timelineScenesLengthRef.current = scenesLength
    timelineScenesRef.current = currentTimeline.scenes.map(scene => ({
      sceneId: scene.sceneId,
      image: scene.image,
      text: scene.text || { content: '', font: 'Noto Sans KR', color: '#ffffff', position: 'center' },
      duration: scene.duration,
      transition: scene.transition,
    }))

    // 다음 프레임에 실행하여 ref가 확실히 설정된 후 실행
    requestAnimationFrame(async () => {
      // loadAllScenesStable은 이미 위에서 체크했으므로 안전하게 사용 가능
      loadAllScenesCompletedRef.current = false
      await loadAllScenesStable()
      
      // loadAllScenes 완료 후 spritesRef와 textsRef 상태 확인
      const sceneIndex = currentSceneIndexRef.current
      
      loadAllScenesCompletedRef.current = true
      
      // loadAllScenes 완료 후 updateCurrentScene이 호출되므로, 
      // updateCurrentScene 완료를 기다린 후 핸들을 그려야 함
      // useSceneManager의 loadAllScenes는 requestAnimationFrame 내부에서 updateCurrentScene을 호출하므로
      // 여러 프레임을 기다려야 함
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (appRef.current && containerRef.current) {
              // 재생 중이면 이미지 렌더링 스킵 (그룹 재생 중일 수 있음)
              const isPlaying = isPlayingRef?.current || false
              
              // 재생 중이 아니면 현재 씬만 표시
              if (!isPlaying) {
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
              }
              // 렌더링은 PixiJS ticker가 처리
              
              // lastRenderedSceneIndexRef 초기화 (전환 효과 추적용)
              lastRenderedSceneIndexRef.current = sceneIndex
              previousSceneIndexRef.current = sceneIndex
              
              // 편집 모드일 때 핸들 다시 표시 (editMode는 ref로 확인)
              // updateCurrentScene 호출 후 핸들을 그리도록 함
              const currentEditMode = editModeRef.current
              if (currentEditMode === 'image') {
                // 이미지 편집 모드일 때는 이미지 핸들만 표시하고 자막 핸들은 제거
                const currentSprite = spritesRef.current.get(sceneIndex)
                
                // 자막 핸들 제거
                const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
                if (existingTextHandles && existingTextHandles.parent) {
                  existingTextHandles.parent.removeChild(existingTextHandles)
                  textEditHandlesRef.current.delete(sceneIndex)
                }
                
                if (!currentSprite) {
                  return
                }
                
                const existingHandles = editHandlesRef.current.get(sceneIndex)
                if (!existingHandles || !existingHandles.parent) {
                  try {
                    drawEditHandlesRef.current(currentSprite, sceneIndex, handleResizeRef.current, saveImageTransformRef.current)
                  } catch {
                    // 이미지 핸들 그리기 실패
                  }
                }
                try {
                  setupSpriteDragRef.current(currentSprite, sceneIndex)
                } catch {
                  // 이미지 드래그 설정 실패
                }
              } else if (currentEditMode === 'text') {
                // 자막 편집 모드일 때는 자막 핸들만 표시하고 이미지 핸들은 제거
                const currentText = textsRef.current.get(sceneIndex)
                
                // 이미지 핸들 제거
                const existingHandles = editHandlesRef.current.get(sceneIndex)
                if (existingHandles && existingHandles.parent) {
                  existingHandles.parent.removeChild(existingHandles)
                  editHandlesRef.current.delete(sceneIndex)
                }
                
                if (!currentText) {
                  return
                }
                
                const existingTextHandles = textEditHandlesRef.current.get(sceneIndex)
                if (!existingTextHandles || !existingTextHandles.parent) {
                  try {
                    drawTextEditHandlesRef.current(currentText, sceneIndex, handleTextResizeRef.current, saveTextTransformRef.current)
                  } catch {
                    // 자막 핸들 그리기 실패
                  }
                }
                try {
                  setupTextDragRef.current(currentText, sceneIndex)
                } catch {
                  // 자막 드래그 설정 실패
                }
              }
            }
          })
        })
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixiReady, timelineScenesKey, loadAllScenesStable])

  // Fabric 씬 동기화
  useEffect(() => {
    const currentTimeline = timelineRef.current
    if (!fabricReady || !currentTimeline || currentTimeline.scenes.length === 0) return
    syncFabricWithScene()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricReady, timelineScenesKey, editMode, syncFabricWithScene])

  return {
    loadAllScenesCompletedRef,
  }
}
