import * as PIXI from 'pixi.js'

/**
 * Glow 필터를 생성합니다 (BlurFilter를 사용하여 후광 효과 생성).
 * @param distance 블러 거리
 * @returns PIXI.BlurFilter
 */
export const createGlowFilter = (distance: number = 10): PIXI.BlurFilter => {
  const blurFilter = new PIXI.BlurFilter()
  blurFilter.blur = distance
  // 후광 효과를 위해 여러 필터를 조합할 수 있지만, 간단하게 BlurFilter 사용
  return blurFilter
}

/**
 * Glitch 필터를 생성합니다 (DisplacementFilter 사용).
 * @param app PIXI.Application 인스턴스
 * @param intensity 글리치 강도
 * @returns PIXI.DisplacementFilter | null
 */
export const createGlitchFilter = (
  app: PIXI.Application | null,
  intensity: number = 10
): PIXI.DisplacementFilter | null => {
  if (!app) return null
  
  // 간단한 Displacement 텍스처 생성
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 랜덤 노이즈 생성
  const imageData = ctx.createImageData(size, size)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.random() * 255
    imageData.data[i] = value // R
    imageData.data[i + 1] = value // G
    imageData.data[i + 2] = 128 // B (중간값)
    imageData.data[i + 3] = 255 // A
  }
  ctx.putImageData(imageData, 0, 0)

  const texture = PIXI.Texture.from(canvas)
  const sprite = new PIXI.Sprite(texture)
  const filter = new PIXI.DisplacementFilter(sprite, intensity)
  return filter
}

