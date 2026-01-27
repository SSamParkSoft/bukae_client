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
    renderTexture: PIXI.RenderTexture,
    app: PIXI.Application,
    sceneIndex: number,
    spritesRef: MutableRefObject<Map<number, PIXI.Sprite>>
  ): void {
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
    app.renderer.render(sceneContainer, { renderTexture })

    // 상태 복원
    savedStates.forEach((state, sprite) => {
      if (!sprite.destroyed) {
        this.restoreSpriteState(sprite, state)
      }
    })
  }
}
