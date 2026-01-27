/**
 * Wipe Transition Shader
 * ANIMATION.md 표준에 따른 Wipe 전환 효과
 * 
 * 좌→우/상→하/대각선 방향으로 와이프 전환
 * softness 파라미터로 부드러운 전환 지원
 */

import * as PIXI from 'pixi.js'

export interface WipeShaderParams {
  direction?: 'left' | 'right' | 'up' | 'down' | 'diagonal'
  softness?: number // 0..1 범위, 전환 가장자리 부드러움
}

/**
 * Wipe Transition Shader 생성
 */
export function createWipeShader(params: WipeShaderParams = {}): PIXI.Filter {
  const { direction = 'right', softness = 0.1 } = params

  const vertexShader = `
    in vec2 aPosition;
    out vec2 vTextureCoord;
    
    void main(void) {
      gl_Position = filterVertexPosition();
      vTextureCoord = filterTextureCoord();
    }
  `

  // 방향에 따른 좌표 계산
  let directionCode = ''
  switch (direction) {
    case 'left':
      directionCode = 'float d = 1.0 - vTextureCoord.x;'
      break
    case 'right':
      directionCode = 'float d = vTextureCoord.x;'
      break
    case 'up':
      directionCode = 'float d = 1.0 - vTextureCoord.y;'
      break
    case 'down':
      directionCode = 'float d = vTextureCoord.y;'
      break
    case 'diagonal':
      directionCode = 'float d = (vTextureCoord.x + vTextureCoord.y) / 2.0;'
      break
    default:
      directionCode = 'float d = vTextureCoord.x;'
  }

  const fragmentShader = `
    in vec2 vTextureCoord;
    
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float progress;
    uniform float softness;
    
    void main(void) {
      ${directionCode}
      
      // 진행률에 따른 전환 위치 계산
      float threshold = progress;
      
      // Softness 적용: 부드러운 전환 가장자리
      float edge = smoothstep(threshold - softness, threshold + softness, d);
      
      vec4 colorA = texture(uTextureA, vTextureCoord);
      vec4 colorB = texture(uTextureB, vTextureCoord);
      
      // edge 값에 따라 A와 B를 블렌딩
      vec4 result = mix(colorA, colorB, edge);
      
      gl_FragColor = result;
    }
  `

  // PixiJS v8 방식: GlProgram과 resources 사용
  const glProgram = new PIXI.GlProgram({
    vertex: vertexShader,
    fragment: fragmentShader,
  })

  const filter = new PIXI.Filter({
    glProgram,
    resources: {
      transitionUniforms: {
        uTextureA: { value: null, type: 'sampler2D' },
        uTextureB: { value: null, type: 'sampler2D' },
        progress: { value: 0.0, type: 'f32' },
        softness: { value: softness, type: 'f32' },
      },
    },
  })

  return filter
}
