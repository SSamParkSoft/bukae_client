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
      // 텍스처 샘플링 (안전한 처리)
      vec4 colorA = texture(uTextureA, vTextureCoord);
      vec4 colorB = texture(uTextureB, vTextureCoord);
      
      // progress를 0~1 범위로 클램프
      float p = clamp(progress, 0.0, 1.0);
      
      // Linear blend: A * (1 - progress) + B * progress
      vec4 result = mix(colorA, colorB, p);
      
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
    
    // GlProgram 객체의 속성 확인 (디버깅용)
    if (process.env.NODE_ENV === 'development') {
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createFadeShader] Failed to create GlProgram', error)
    }
    // Fallback: 빈 필터 반환 (인자 없이 생성 불가하므로 null 반환)
    // Fallback: 빈 필터 반환 (인자 없이 생성 불가하므로 빈 객체 전달)
    return new PIXI.Filter({})
  }

  // Filter 생성자에 glProgram과 resources를 함께 전달
  // Filter 생성자가 내부적으로 glProgram의 fragment/vertex 속성을 확인하려고 할 때 문제가 발생할 수 있음
  // glProgram 객체의 fragment/vertex 속성이 실제로 존재하는지 확인
  if (!glProgram.fragment || !glProgram.vertex) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createFadeShader] GlProgram missing fragment or vertex', {
        hasFragment: !!glProgram.fragment,
        hasVertex: !!glProgram.vertex,
      })
    }
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
      },
    }
    
    return filter
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[createFadeShader] Failed to create Filter', error, {
        glProgramType: typeof glProgram,
        glProgramFragment: glProgram?.fragment,
        glProgramVertex: glProgram?.vertex,
      })
    }
    // Fallback: 빈 필터 반환 (인자 없이 생성 불가하므로 null 반환)
    // Fallback: 빈 필터 반환 (인자 없이 생성 불가하므로 빈 객체 전달)
    return new PIXI.Filter({})
  }
}
