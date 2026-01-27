/**
 * Transition Factory
 * Shader 기반 Transition과 GSAP 기반 Transition을 통합 관리합니다.
 */

import * as PIXI from 'pixi.js'
import { TRANSITION_CONFIG, type TransitionMode } from './config'

/**
 * Transition 파라미터
 */
export interface TransitionParams {
  /** 전환 효과 타입 */
  type: string
  /** 전환 시간 (초) */
  duration: number
  /** 스테이지 너비 */
  stageWidth: number
  /** 스테이지 높이 */
  stageHeight: number
  /** 씬 인덱스 */
  sceneIndex: number
  /** 이전 씬 인덱스 */
  previousIndex?: number | null
  /** 씬 ID (그룹 전환용) */
  sceneId?: number
  /** 재생 중 여부 */
  isPlaying?: boolean
  /** 추가 파라미터 */
  params?: Record<string, unknown>
}

/**
 * Transition Renderer 인터페이스
 * Shader와 GSAP 모두 이 인터페이스를 구현합니다.
 */
export interface TransitionRenderer {
  /**
   * Transition 적용
   * @param t - Transport 시간 (초)
   * @param sceneA - 이전 씬 Container
   * @param sceneB - 현재 씬 Container
   * @param params - Transition 파라미터
   */
  apply(
    t: number,
    sceneA: PIXI.Container | null,
    sceneB: PIXI.Container | null,
    params: TransitionParams
  ): void
  
  /**
   * Transition 정리
   */
  cleanup(): void
  
  /**
   * Transition 진행률 업데이트 (t 기반)
   * @param t - Transport 시간 (초)
   */
  updateProgress(t: number): void
}

/**
 * GSAP 기반 Transition Renderer (기존 구현 래퍼)
 * 현재는 placeholder로, 향후 GSAP 기반 구현을 래핑할 예정
 */
export class GsapTransitionRenderer implements TransitionRenderer {
  private type: string
  private params: TransitionParams
  
  constructor(type: string, params: TransitionParams) {
    this.type = type
    this.params = params
  }
  
  apply(
    t: number,
    sceneA: PIXI.Container | null,
    sceneB: PIXI.Container | null,
    params: TransitionParams
  ): void {
    // GSAP 기반 Transition은 기존 applyEnterEffect를 사용
    // 현재는 placeholder
    // TODO: 기존 GSAP 로직을 여기로 마이그레이션
  }
  
  cleanup(): void {
    // GSAP timeline 정리
  }
  
  updateProgress(t: number): void {
    // GSAP timeline의 time 업데이트
  }
}

/**
 * Shader 기반 Transition Renderer (향후 구현)
 */
export class ShaderTransitionRenderer implements TransitionRenderer {
  private type: string
  private params: TransitionParams
  
  constructor(type: string, params: TransitionParams) {
    this.type = type
    this.params = params
  }
  
  apply(
    t: number,
    sceneA: PIXI.Container | null,
    sceneB: PIXI.Container | null,
    params: TransitionParams
  ): void {
    // Shader 기반 Transition 구현
    // TODO: Shader Transition 구현 시 여기에 작성
  }
  
  cleanup(): void {
    // Shader 정리
  }
  
  updateProgress(t: number): void {
    // Shader uniform 업데이트
  }
}

/**
 * Transition Factory
 * 설정에 따라 적절한 Transition Renderer를 생성합니다.
 */
export class TransitionFactory {
  /**
   * Transition Renderer 생성
   * @param type - 전환 효과 타입
   * @param params - Transition 파라미터
   * @param sceneIndex - 씬 인덱스 (씬별 모드 확인용)
   * @returns Transition Renderer 인스턴스
   */
  static create(
    type: string,
    params: TransitionParams,
    sceneIndex?: number
  ): TransitionRenderer {
    // 씬별 모드 확인
    const mode: TransitionMode = sceneIndex !== undefined
      ? TRANSITION_CONFIG.getTransitionMode(sceneIndex)
      : TRANSITION_CONFIG.useShaderTransitions ? 'shader' : 'gsap'
    
    if (mode === 'shader') {
      return new ShaderTransitionRenderer(type, params)
    } else {
      return new GsapTransitionRenderer(type, params)
    }
  }
  
  /**
   * 현재 설정된 Transition 모드 확인
   * @param sceneIndex - 씬 인덱스 (선택적)
   * @returns Transition 모드
   */
  static getMode(sceneIndex?: number): TransitionMode {
    if (sceneIndex !== undefined) {
      return TRANSITION_CONFIG.getTransitionMode(sceneIndex)
    }
    return TRANSITION_CONFIG.useShaderTransitions ? 'shader' : 'gsap'
  }
}
