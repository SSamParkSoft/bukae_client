/**
 * 씬 캡처 유틸리티
 * 씬 Container를 RenderTexture로 캡처하는 기능 제공
 */

import * as PIXI from 'pixi.js'
import type { MutableRefObject } from 'react'

/**
 * 스프라이트 상태 저장/복원을 위한 인터페이스
 */
export interface SpriteState {
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  alpha: number
  visible: boolean
  filters: PIXI.Filter[]
}

/**
 * 씬 캡처 클래스
 * 공유 스프라이트의 상태를 보존하면서 씬을 RenderTexture로 캡처합니다.
 */
export class SceneCapture {
  /**
   * 스프라이트 상태 저장
   */
  static saveSpriteState(sprite: PIXI.Sprite): SpriteState {
    return {
      x: sprite.x,
      y: sprite.y,
      scaleX: sprite.scale.x,
      scaleY: sprite.scale.y,
      rotation: sprite.rotation,
      alpha: sprite.alpha,
      visible: sprite.visible,
      filters: sprite.filters ? [...sprite.filters] : [],
    }
  }

  /**
   * 스프라이트 상태 복원
   */
  static restoreSpriteState(sprite: PIXI.Sprite, state: SpriteState): void {
    sprite.x = state.x
    sprite.y = state.y
    sprite.scale.set(state.scaleX, state.scaleY)
    sprite.rotation = state.rotation
    sprite.alpha = state.alpha
    sprite.visible = state.visible
    sprite.filters = state.filters
  }

  /**
   * 씬 Container를 RenderTexture로 캡처 (상태 보존)
   * 
   * @param sceneContainer - 캡처할 씬 Container
   * @param renderTexture - 렌더링할 RenderTexture
   * @param app - PixiJS Application
   * @param sceneIndex - 씬 인덱스 (디버깅용)
   * @param spritesRef - 스프라이트 맵 ref (공유 스프라이트 상태 저장용)
   */
  static captureScene(
    sceneContainer: PIXI.Container,
    renderTexture: PIXI.RenderTexture | null,
    app: PIXI.Application,
    sceneIndex: number,
    spritesRef: MutableRefObject<Map<number, PIXI.Sprite>>
  ): void {
    // RenderTexture 유효성 검사
    if (!renderTexture) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SceneCapture] RenderTexture is null', { sceneIndex })
      }
      return
    }

    // sceneContainer 유효성 검사
    if (!sceneContainer || sceneContainer.destroyed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SceneCapture] SceneContainer is null or destroyed', {
          sceneIndex,
          hasContainer: !!sceneContainer,
          isDestroyed: sceneContainer?.destroyed,
        })
      }
      return
    }

    // app.renderer 유효성 검사
    if (!app || !app.renderer || app.destroyed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SceneCapture] App or renderer is invalid', {
          sceneIndex,
          hasApp: !!app,
          hasRenderer: !!app?.renderer,
          appDestroyed: app?.destroyed,
        })
      }
      return
    }

    // sceneContainer의 children이 유효한지 확인
    // Container.collectRenderablesWithBounds에서 children의 length를 읽으려고 할 때 null이면 에러 발생
    // children이 배열인지 확인하고, length 속성이 있는지 확인
    if (!sceneContainer.children || !Array.isArray(sceneContainer.children) || typeof sceneContainer.children.length !== 'number') {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SceneCapture] SceneContainer children is invalid', {
          sceneIndex,
          hasChildren: !!sceneContainer.children,
          childrenType: typeof sceneContainer.children,
          isArray: Array.isArray(sceneContainer.children),
          childrenLength: sceneContainer.children?.length,
        })
      }
      return
    }

    // 공유 스프라이트의 상태 저장
    const savedStates = new Map<PIXI.Sprite, SpriteState>()
    const sprite = spritesRef.current.get(sceneIndex)

    if (sprite) {
      // 현재 씬의 스프라이트 상태 저장
      savedStates.set(sprite, this.saveSpriteState(sprite))

      // 같은 그룹의 다른 씬들도 확인하여 공유 스프라이트 상태 저장
      // (현재는 해당 씬의 스프라이트만 저장, 향후 확장 가능)
    }

    // RenderTexture로 렌더링
    // PixiJS v8: renderTexture를 옵션 객체로 전달
    try {
      app.renderer.render(sceneContainer, { renderTexture })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[SceneCapture] Failed to render scene', {
          sceneIndex,
          error,
          renderTexture: !!renderTexture,
          hasContainer: !!sceneContainer,
          containerDestroyed: sceneContainer?.destroyed,
          childrenCount: sceneContainer?.children?.length,
        })
      }
      return
    }

    // 상태 복원
    savedStates.forEach((state, sprite) => {
      if (!sprite.destroyed) {
        this.restoreSpriteState(sprite, state)
      }
    })
  }
}
