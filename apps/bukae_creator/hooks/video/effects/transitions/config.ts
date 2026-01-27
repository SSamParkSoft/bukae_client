/**
 * Transition 설정 및 Feature Flag
 * Shader 기반 Transition과 GSAP 기반 Transition 간 전환을 관리합니다.
 */

/**
 * Transition 모드 타입
 */
export type TransitionMode = 'shader' | 'gsap'

/**
 * Transition 설정
 */
export const TRANSITION_CONFIG = {
  /**
   * Shader 기반 Transition 사용 여부
   * 환경 변수로 제어 가능: NEXT_PUBLIC_USE_SHADER_TRANSITIONS=true
   */
  useShaderTransitions: process.env.NEXT_PUBLIC_USE_SHADER_TRANSITIONS === 'true',
  
  /**
   * 기존 GSAP Transition 사용 여부 (fallback)
   * useShaderTransitions가 false일 때 자동으로 true
   */
  get useGrapTransitions(): boolean {
    return !this.useShaderTransitions
  },
  
  /**
   * 점진적 마이그레이션을 위한 씬별 설정
   * 특정 씬에 대해 강제로 Shader 또는 GSAP 사용 가능
   */
  sceneTransitionMode: new Map<number, TransitionMode>(),
  
  /**
   * 특정 씬의 Transition 모드 가져오기
   */
  getTransitionMode(sceneIndex: number): TransitionMode {
    const forcedMode = this.sceneTransitionMode.get(sceneIndex)
    if (forcedMode) {
      return forcedMode
    }
    return this.useShaderTransitions ? 'shader' : 'gsap'
  },
  
  /**
   * 특정 씬의 Transition 모드 설정
   */
  setTransitionMode(sceneIndex: number, mode: TransitionMode): void {
    this.sceneTransitionMode.set(sceneIndex, mode)
  },
  
  /**
   * 모든 씬별 설정 초기화
   */
  clearSceneModes(): void {
    this.sceneTransitionMode.clear()
  },
}
