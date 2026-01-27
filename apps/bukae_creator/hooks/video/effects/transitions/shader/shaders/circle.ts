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
      // progress를 0~1 범위로 클램프
      float p = clamp(progress, 0.0, 1.0);
      
      // 중심점으로부터의 거리 계산
      vec2 diff = vTextureCoord - center;
      float dist = length(diff);
      
      // 진행률에 따른 반지름 계산 (0에서 1.414까지, 대각선 최대 거리)
      float maxRadius = 1.414; // sqrt(2)
      float radius = p * maxRadius;
      
      // Softness 적용: 부드러운 전환 가장자리
      float s = clamp(softness, 0.0, 1.0);
      float edge = smoothstep(radius - s, radius + s, dist);
      
      // 텍스처 샘플링 (안전한 처리)
      vec4 colorA = texture(uTextureA, vTextureCoord);
      vec4 colorB = texture(uTextureB, vTextureCoord);
      
      // edge 값에 따라 A와 B를 블렌딩
      vec4 result = mix(colorA, colorB, edge);
      
      gl_FragColor = result;
    }
  `

  // PixiJS v8 방식: GlProgram과 resources 사용
  // vertexShader와 fragmentShader가 정의되어 있는지 확인
  if (!vertexShader || !fragmentShader) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createCircleShader] Shader source is undefined', {
        hasVertex: !!vertexShader,
        hasFragment: !!fragmentShader,
      })
    }
    // Fallback: 빈 필터 반환
    return new PIXI.Filter({})
  }

  // 빈 텍스처로 초기화 (null 대신)
  const emptyTexture = PIXI.Texture.EMPTY

  // PixiJS v8 방식: GlProgram을 먼저 생성하고 검증
  let glProgram: PIXI.GlProgram
  try {
    glProgram = new PIXI.GlProgram({
      fragment: fragmentShader,
      vertex: vertexShader,
    })
  } catch (glError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createCircleShader] Failed to create GlProgram', glError)
    }
    // Fallback: 빈 필터 반환
    return new PIXI.Filter({})
  }

  try {
    // Filter 생성자가 glProgram을 파싱할 때 match 에러가 발생하므로
    // 빈 Filter를 생성한 후 glProgram과 resources를 직접 설정
    const filter = new PIXI.Filter({})
    
    // glProgram과 resources를 직접 설정
    ;(filter as unknown as { glProgram: PIXI.GlProgram }).glProgram = glProgram
    ;(filter as unknown as { resources: Record<string, unknown> }).resources = {
      transitionUniforms: {
        uTextureA: { value: emptyTexture },
        uTextureB: { value: emptyTexture },
        progress: { value: 0.0, type: 'f32' },
        softness: { value: softness, type: 'f32' },
        center: { value: [center.x, center.y], type: 'vec2<f32>' },
      },
    }
    
    return filter
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createCircleShader] Failed to create Filter', error, {
        hasVertexShader: !!vertexShader,
        hasFragmentShader: !!fragmentShader,
        vertexShaderLength: vertexShader?.length,
        fragmentShaderLength: fragmentShader?.length,
      })
    }
    // Fallback: 빈 필터 반환
    return new PIXI.Filter({})
  }
}
