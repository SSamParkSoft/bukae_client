/**
 * Transition Shader 팩토리
 * 전환 효과 타입에 따라 적절한 Shader를 생성합니다.
 */

import * as PIXI from 'pixi.js'
import { createFadeShader } from './fade'
import { createWipeShader } from './wipe'
import { createCircleShader } from './circle'

/**
 * Transition Shader 생성
 * @param type - 전환 효과 타입 ('fade', 'wipe', 'circle' 등)
 * @param params - 추가 파라미터 (선택적)
 * @returns PixiJS Filter 인스턴스
 */
export function createTransitionShader(type: string, params?: Record<string, unknown>): PIXI.Filter | null {
  switch (type) {
    // fade는 direct transition으로 처리되므로 shader transition에서 제외
    case 'wipe':
    case 'wipe-left':
    case 'wipe-right':
    case 'wipe-up':
    case 'wipe-down':
      // wipe 타입에서 방향 추출
      const direction = type.includes('left') ? 'left' :
                        type.includes('right') ? 'right' :
                        type.includes('up') ? 'up' :
                        type.includes('down') ? 'down' : 'right'
      return createWipeShader({
        direction,
        softness: (params?.softness as number) || 0.1,
      })
    
    // circle과 circular는 direct transition으로 처리되므로 shader transition에서 제외
    default:
      // 알 수 없는 타입이면 null 반환 (GSAP fallback)
      return null
  }
}

/**
 * Shader 기반 Transition 타입인지 확인
 * fade와 circle은 direct transition으로 처리되므로 shader transition에서 제외
 */
export function isShaderTransition(type: string): boolean {
  const shaderTypes = ['wipe', 'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down']
  return shaderTypes.includes(type)
}
