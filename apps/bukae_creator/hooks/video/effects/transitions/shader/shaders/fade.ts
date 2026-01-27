/**
 * Fade Transition Shader
 * ANIMATION.md 표준에 따른 Fade 전환 효과
 * 
 * Shader는 progress에 따라 A와 B를 픽셀 단위로 합성합니다.
 * Fade는 linear blend: result = A * (1 - progress) + B * progress
 */

import * as PIXI from 'pixi.js'

/**
 * Fade Transition Shader 생성
 */
export function createFadeShader(): PIXI.Filter {
  const vertexShader = `
    in vec2 aPosition;
    out vec2 vTextureCoord;
    
    void main(void) {
      gl_Position = filterVertexPosition();
      vTextureCoord = filterTextureCoord();
    }
  `

  const fragmentShader = `
    in vec2 vTextureCoord;
    
    uniform sampler2D uTextureA;
    uniform sampler2D uTextureB;
    uniform float progress;
    
    void main(void) {
      vec4 colorA = texture(uTextureA, vTextureCoord);
      vec4 colorB = texture(uTextureB, vTextureCoord);
      
      // Linear blend: A * (1 - progress) + B * progress
      vec4 result = mix(colorA, colorB, progress);
      
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
      },
    },
  })

  return filter
}
