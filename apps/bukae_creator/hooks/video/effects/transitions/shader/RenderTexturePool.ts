/**
 * RenderTexture 풀링 시스템
 * Shader Transition을 위한 RenderTexture 재사용 관리
 */

import * as PIXI from 'pixi.js'

export interface RenderTextureOptions {
  /** 해상도 배율 (0.5 = 절반 해상도, 메모리 1/4) */
  resolution?: number
  /** 품질 설정 */
  quality?: 'low' | 'medium' | 'high'
}

/**
 * RenderTexture 풀 클래스
 * RenderTexture를 재사용하여 메모리 할당/해제 비용을 줄입니다.
 */
export class RenderTexturePool {
  private pool: PIXI.RenderTexture[] = []
  private inUse: Set<PIXI.RenderTexture> = new Set()
  private readonly maxPoolSize: number = 4 // 최대 풀 크기
  private readonly width: number
  private readonly height: number
  private readonly resolution: number
  private readonly quality: 'low' | 'medium' | 'high'

  constructor(
    width: number,
    height: number,
    options: RenderTextureOptions = {}
  ) {
    this.width = width
    this.height = height
    this.resolution = options.resolution ?? 1.0
    this.quality = options.quality ?? 'medium'
  }

  /**
   * RenderTexture 획득 (풀에서 가져오거나 새로 생성)
   */
  acquire(): PIXI.RenderTexture | null {
    let texture = this.pool.pop()
    if (!texture) {
      try {
        texture = PIXI.RenderTexture.create({
          width: this.width,
          height: this.height,
          resolution: this.resolution,
        })
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[RenderTexturePool] Failed to create RenderTexture', {
            width: this.width,
            height: this.height,
            resolution: this.resolution,
            error,
          })
        }
        return null
      }
    }
    if (texture) {
      this.inUse.add(texture)
    }
    return texture
  }

  /**
   * RenderTexture 반환 (풀로 돌려보냄)
   */
  release(texture: PIXI.RenderTexture): void {
    if (this.inUse.has(texture)) {
      this.inUse.delete(texture)
      if (this.pool.length < this.maxPoolSize) {
        this.pool.push(texture)
      } else {
        // 풀이 가득 차면 즉시 해제
        texture.destroy()
      }
    }
  }

  /**
   * 모든 RenderTexture 정리
   */
  destroy(): void {
    this.pool.forEach((texture) => texture.destroy())
    this.inUse.forEach((texture) => texture.destroy())
    this.pool = []
    this.inUse.clear()
  }

  /**
   * 현재 사용 중인 RenderTexture 개수
   */
  getInUseCount(): number {
    return this.inUse.size
  }

  /**
   * 풀에 있는 RenderTexture 개수
   */
  getPoolSize(): number {
    return this.pool.length
  }
}
