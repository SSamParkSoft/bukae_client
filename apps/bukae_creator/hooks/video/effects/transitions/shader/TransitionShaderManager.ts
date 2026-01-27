/**
 * Transition Shader Manager
 * ANIMATION.md 표준에 따른 Shader 기반 Transition 관리
 * 
 * 아키텍처:
 * - RenderTexture A/B: 이전/현재 씬을 캡처
 * - Transition Quad: 화면 전체를 덮는 Quad에 Shader 적용
 * - progress: t 기반으로 계산된 진행률 (0..1)
 */

import * as PIXI from 'pixi.js'
import type { MutableRefObject } from 'react'
import { RenderTexturePool } from './RenderTexturePool'
import { SceneCapture } from './SceneCapture'
import type { TransitionParams } from '../TransitionFactory'

/**
 * Transition Shader Manager
 */
export class TransitionShaderManager {
  private app: PIXI.Application
  private texturePool: RenderTexturePool
  private textureA: PIXI.RenderTexture | null = null
  private textureB: PIXI.RenderTexture | null = null
  private transitionQuad: PIXI.Sprite | null = null
  private transitionContainer: PIXI.Container | null = null
  private currentShader: PIXI.Filter | null = null
  private stageDimensions: { width: number; height: number }
  private spritesRef: MutableRefObject<Map<number, PIXI.Sprite>>

  constructor(
    app: PIXI.Application,
    stageDimensions: { width: number; height: number },
    spritesRef: MutableRefObject<Map<number, PIXI.Sprite>>
  ) {
    this.app = app
    this.stageDimensions = stageDimensions
    this.spritesRef = spritesRef
    this.texturePool = new RenderTexturePool(
      stageDimensions.width,
      stageDimensions.height,
      { resolution: 1.0, quality: 'medium' }
    )
  }

  /**
   * Transition 시작
   * 이전 씬과 현재 씬을 RenderTexture로 캡처
   */
  beginTransition(
    sceneAContainer: PIXI.Container,
    sceneBContainer: PIXI.Container,
    sceneAIndex: number,
    sceneBIndex: number
  ): void {
    // Container 유효성 검사
    if (!sceneAContainer || sceneAContainer.destroyed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TransitionShaderManager] Scene A container is invalid', {
          sceneAIndex,
          hasContainer: !!sceneAContainer,
          isDestroyed: sceneAContainer?.destroyed,
        })
      }
      return
    }

    if (!sceneBContainer || sceneBContainer.destroyed) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TransitionShaderManager] Scene B container is invalid', {
          sceneBIndex,
          hasContainer: !!sceneBContainer,
          isDestroyed: sceneBContainer?.destroyed,
        })
      }
      return
    }

    // RenderTexture 획득
    this.textureA = this.texturePool.acquire()
    this.textureB = this.texturePool.acquire()

    // RenderTexture가 null인지 확인
    if (!this.textureA || !this.textureB) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[TransitionShaderManager] Failed to acquire RenderTexture', {
          textureA: !!this.textureA,
          textureB: !!this.textureB,
        })
      }
      return
    }

    // 씬 A 캡처
    SceneCapture.captureScene(
      sceneAContainer,
      this.textureA,
      this.app,
      sceneAIndex,
      this.spritesRef
    )

    // 씬 B 캡처
    SceneCapture.captureScene(
      sceneBContainer,
      this.textureB,
      this.app,
      sceneBIndex,
      this.spritesRef
    )
  }

  /**
   * Transition Quad 생성 및 Shader 적용
   */
  createTransitionQuad(
    shader: PIXI.Filter,
    container: PIXI.Container
  ): void {
    // 기존 Quad 제거
    this.cleanup()

    // Transition Quad 생성 (화면 전체를 덮는 Sprite)
    // Shader filter를 사용하므로 texture는 중요하지 않지만, 투명한 texture 사용
    const quadTexture = PIXI.Texture.WHITE
    this.transitionQuad = new PIXI.Sprite(quadTexture)
    this.transitionQuad.width = this.stageDimensions.width
    this.transitionQuad.height = this.stageDimensions.height
    this.transitionQuad.alpha = 1.0 // 완전히 불투명하게 설정
    this.transitionQuad.filters = [shader]
    this.currentShader = shader

    // Container에 추가
    this.transitionContainer = container
    container.addChild(this.transitionQuad)
    
    // 최상위 레이어로 설정 (자막 아래)
    const maxIndex = container.children.length - 1
    container.setChildIndex(this.transitionQuad, maxIndex)
    
    // 초기 uniform 업데이트 (텍스처 설정)
    if (this.textureA && this.textureB) {
      this.updateProgress(0)
    }
  }

  /**
   * Transition 진행률 업데이트
   * @param progress 0..1 범위의 진행률
   */
  updateProgress(progress: number): void {
    if (!this.currentShader || !this.textureA || !this.textureB) {
      return
    }

    // Shader uniform 업데이트
    // PixiJS v8 방식: resources.transitionUniforms.uniforms를 통해 접근
    const filter = this.currentShader as PIXI.Filter & {
      resources?: {
        transitionUniforms?: {
          uniforms?: {
            progress?: { value?: number }
            uTextureA?: { value?: PIXI.Texture | null }
            uTextureB?: { value?: PIXI.Texture | null }
            softness?: { value?: number }
            center?: { value?: number[] }
          }
        }
      }
    }
    
    // resources.transitionUniforms가 UniformGroup으로 변환되어 uniforms 속성을 가짐
    const uniformGroup = filter.resources?.transitionUniforms
    if (!uniformGroup) {
      return
    }

    // UniformGroup은 uniforms 속성을 가짐
    const uniforms = uniformGroup.uniforms
    if (!uniforms) {
      return
    }
    
    // progress 업데이트
    if (uniforms.progress && typeof uniforms.progress === 'object' && 'value' in uniforms.progress) {
      uniforms.progress.value = Math.max(0, Math.min(1, progress))
    }
    
    // 텍스처 업데이트 (항상 업데이트하여 최신 상태 유지)
    if (uniforms.uTextureA && typeof uniforms.uTextureA === 'object' && 'value' in uniforms.uTextureA) {
      uniforms.uTextureA.value = this.textureA
    }
    if (uniforms.uTextureB && typeof uniforms.uTextureB === 'object' && 'value' in uniforms.uTextureB) {
      uniforms.uTextureB.value = this.textureB
    }
  }

  /**
   * Transition 종료 및 정리
   */
  endTransition(): void {
    // RenderTexture 반환
    if (this.textureA) {
      this.texturePool.release(this.textureA)
      this.textureA = null
    }
    if (this.textureB) {
      this.texturePool.release(this.textureB)
      this.textureB = null
    }

    // Transition Quad 제거
    this.cleanup()
  }

  /**
   * Transition Quad 및 Shader 정리
   */
  cleanup(): void {
    if (this.transitionQuad && this.transitionContainer) {
      this.transitionContainer.removeChild(this.transitionQuad)
      this.transitionQuad.destroy()
      this.transitionQuad = null
      this.transitionContainer = null
    }
    this.currentShader = null
  }

  /**
   * 모든 리소스 정리
   */
  destroy(): void {
    this.endTransition()
    this.texturePool.destroy()
  }

  /**
   * Transition이 활성 상태인지 확인
   */
  isActive(): boolean {
    return this.transitionQuad !== null && this.textureA !== null && this.textureB !== null
  }
}
