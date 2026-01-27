/**
 * Circle Transition Shader
 * ANIMATION.md 표준에 따른 Circle Wipe 전환 효과
 * 
 * 중심점에서 원형으로 확장되는 전환
 * center, radius, softness 파라미터 지원
 */

import * as PIXI from 'pixi.js'

export interface CircleShaderParams {
  center?: { x: number; y: number } // 0..1 범위의 정규화된 좌표
  softness?: number // 0..1 범위, 전환 가장자리 부드러움
}

/**
 * Circle Transition Shader 생성
 */
export function createCircleShader(params: CircleShaderParams = {}): PIXI.Filter {
  const { center = { x: 0.5, y: 0.5 }, softness = 0.1 } = params

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
    uniform float softness;
    uniform vec2 center;
    
    void main(void) {
      // 중심점으로부터의 거리 계산
      vec2 diff = vTextureCoord - center;
      float dist = length(diff);
      
      // 진행률에 따른 반지름 계산 (0에서 1.414까지, 대각선 최대 거리)
      float maxRadius = 1.414; // sqrt(2)
      float radius = progress * maxRadius;
      
      // Softness 적용: 부드러운 전환 가장자리
      float edge = smoothstep(radius - softness, radius + softness, dist);
      
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
        center: { value: [center.x, center.y], type: 'vec2<f32>' },
      },
    },
  })

  return filter
}
