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

  // 빈 텍스처로 초기화 (null 대신)
  const emptyTexture = PIXI.Texture.EMPTY

  // PixiJS v8 방식: GlProgram을 먼저 생성하고 검증
  let glProgram: PIXI.GlProgram
  try {
    glProgram = new PIXI.GlProgram({
      fragment: fragmentShader,
      vertex: vertexShader,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createWipeShader] Failed to create GlProgram', error)
    }
    // Fallback: 빈 필터 반환
    return new PIXI.Filter({})
  }

  // Filter 생성자가 glProgram을 파싱할 때 match 에러가 발생하므로
  // 빈 Filter를 생성한 후 glProgram과 resources를 직접 설정
  try {
    const filter = new PIXI.Filter({})
    
    // glProgram과 resources를 직접 설정
    ;(filter as unknown as { glProgram: PIXI.GlProgram }).glProgram = glProgram
    ;(filter as unknown as { resources: Record<string, unknown> }).resources = {
      transitionUniforms: {
        uTextureA: { value: emptyTexture },
        uTextureB: { value: emptyTexture },
        progress: { value: 0.0, type: 'f32' },
        softness: { value: softness, type: 'f32' },
      },
    }
    
    return filter
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createWipeShader] Failed to create Filter', error)
    }
    // Fallback: 빈 필터 반환
    return new PIXI.Filter({})
  }
}
