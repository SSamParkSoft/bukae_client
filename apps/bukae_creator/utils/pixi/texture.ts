import * as PIXI from 'pixi.js'

/**
 * 텍스처 캐시를 사용하여 PixiJS 텍스처를 로드합니다.
 * @param url 텍스처 URL
 * @param textureCache 텍스처 캐시 Map
 * @returns Promise<PIXI.Texture>
 */
export const loadPixiTexture = (
  url: string,
  textureCache: Map<string, PIXI.Texture>
): Promise<PIXI.Texture> => {
  return new Promise((resolve, reject) => {
    if (textureCache.has(url)) {
      resolve(textureCache.get(url)!)
      return
    }

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      try {
        const texture = PIXI.Texture.from(url)
        textureCache.set(url, texture)
        resolve(texture)
        return
      } catch (error) {
        console.error('Failed to load data/blob URL:', error)
      }
    }

    PIXI.Assets.load(url)
      .then((texture) => {
        if (texture) {
          textureCache.set(url, texture)
          resolve(texture)
        } else {
          reject(new Error(`Invalid texture: ${url}`))
        }
      })
      .catch(() => {
        try {
          const fallbackTexture = PIXI.Texture.from(url)
          if (fallbackTexture) {
            textureCache.set(url, fallbackTexture)
            resolve(fallbackTexture)
          } else {
            reject(new Error(`Failed to load: ${url}`))
          }
        } catch {
          reject(new Error(`Failed to load: ${url}`))
        }
      })
  })
}

