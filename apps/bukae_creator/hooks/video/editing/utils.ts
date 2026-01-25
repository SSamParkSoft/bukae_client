/**
 * 편집 관련 공통 유틸리티 함수
 */

import * as PIXI from 'pixi.js'
import { TimelineData } from '@/store/useVideoCreateStore'

// Canvas 크기 (9:16 비율, 1080x1920)
export const STAGE_WIDTH = 1080
export const STAGE_HEIGHT = 1920

/**
 * 마우스 좌표를 PixiJS 좌표로 변환
 */
export function getPixiCoordinates(e: MouseEvent, app: PIXI.Application): { x: number; y: number } {
  const canvas = app.canvas
  if (!canvas || !app.screen) {
    return { x: 0, y: 0 }
  }
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 }
  }
  
  const scaleX = app.screen.width / rect.width
  const scaleY = app.screen.height / rect.height
  
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

/**
 * 요소가 canvas 밖으로 나갔는지 체크
 */
export function isOutsideCanvas(element: PIXI.Sprite | PIXI.Text): boolean {
  const bounds = element.getBounds()
  
  if (
    bounds.x + bounds.width < 0 ||
    bounds.x > STAGE_WIDTH ||
    bounds.y + bounds.height < 0 ||
    bounds.y > STAGE_HEIGHT
  ) {
    return true
  }
  return false
}

/**
 * 중앙 위치로 복귀 (크기 조정하기 버튼의 템플릿 위치)
 */
export function resetToCenter(
  element: PIXI.Sprite | PIXI.Text,
  sceneIndex: number,
  timeline: TimelineData | null,
  setTimeline: (timeline: TimelineData) => void,
  isText: boolean = false
): void {
  if (!timeline) return

  if (isText) {
    // 텍스트: 하단 중앙 위치
    const textY = STAGE_HEIGHT * 0.92
    const textWidth = STAGE_WIDTH * 0.75
    
    element.x = STAGE_WIDTH * 0.5
    element.y = textY
    
    if (element instanceof PIXI.Text && element.style) {
      element.style.wordWrapWidth = textWidth
      element.text = element.text
    }
    
    const bounds = element.getBounds()
    const transform = {
      x: element.x,
      y: element.y,
      width: bounds.width,
      height: bounds.height,
      scaleX: element.scale.x,
      scaleY: element.scale.y,
      rotation: element.rotation,
    }
    
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (i === sceneIndex) {
          return {
            ...scene,
            text: {
              ...scene.text,
              transform,
            },
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
  } else {
    // 이미지: 상단 15%부터 시작, 가로 100%, 높이 70%
    const imageY = STAGE_HEIGHT * 0.15
    
    element.x = 0
    element.y = imageY
    element.width = STAGE_WIDTH
    element.height = STAGE_HEIGHT * 0.7
    
    const transform = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      scaleX: element.scale.x,
      scaleY: element.scale.y,
      rotation: element.rotation,
    }
    
    const nextTimeline: TimelineData = {
      ...timeline,
      scenes: timeline.scenes.map((scene, i) => {
        if (i === sceneIndex) {
          return {
            ...scene,
            imageTransform: transform,
          }
        }
        return scene
      }),
    }
    setTimeline(nextTimeline)
  }
}

