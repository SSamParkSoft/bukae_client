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
    // URL 유효성 검사
    if (!url || typeof url !== 'string' || url.trim() === '') {
      reject(new Error(`Invalid texture URL: empty or invalid URL`))
      return
    }

    if (textureCache.has(url)) {
      resolve(textureCache.get(url)!)
      return
    }

    if (url.startsWith('data:') || url.startsWith('blob:')) {
      // blob URL은 HTMLImageElement를 통해 먼저 로드한 후 텍스처 생성 (더 안정적)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          // 이미지가 완전히 로드되었는지 확인
          if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
            throw new Error('Image not fully loaded')
          }
          
          const texture = PIXI.Texture.from(img)
          
          if (!texture) {
            throw new Error('PIXI.Texture.from returned undefined')
          }
          
          if (!texture.baseTexture) {
            throw new Error('Texture baseTexture is undefined')
          }
          
          texture.baseTexture.update()
          textureCache.set(url, texture)
          resolve(texture)
        } catch (textureError) {
          console.error('Failed to create texture from data/blob URL:', textureError)
          reject(new Error(`Failed to create texture from data/blob: ${url.substring(0, 50)}...`))
        }
      }
      
      img.onerror = (e) => {
        console.error('Failed to load data/blob URL:', e)
        reject(new Error(`Failed to load data/blob image: ${url.substring(0, 50)}...`))
      }
      
      img.src = url
      return
    }

    // 쿠팡 이미지의 경우 CORS 문제가 있을 수 있으므로 서버 프록시 사용
    // coupangcdn.com, ads-partners.coupang.com 등 모든 쿠팡 이미지 도메인 포함
    const isCoupangImage = 
      url.includes('coupangcdn.com') || 
      url.includes('ads-partners.coupang.com') ||
      (url.includes('coupang.com') && url.includes('/image'))
    
    // 쿠팡 이미지는 서버 프록시를 통해 로드
    if (isCoupangImage) {
      // 절대 URL로 프록시 URL 생성
      const proxyUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api/media/proxy?url=${encodeURIComponent(url)}`
        : `/api/media/proxy?url=${encodeURIComponent(url)}`
      
      
      // 프록시 API를 통해 이미지를 blob으로 가져온 후 텍스처 생성
      fetch(proxyUrl)
        .then((response) => {
          if (!response.ok) {
            const errorText = response.statusText || `HTTP ${response.status}`
            throw new Error(`Proxy API returned ${response.status}: ${errorText}`)
          }
          const contentType = response.headers.get('content-type')
          return response.blob()
        })
        .then((blob) => {
          if (!blob || blob.size === 0) {
            throw new Error('프록시 API가 빈 blob을 반환했습니다')
          }
          const blobUrl = URL.createObjectURL(blob)
          
          // Blob URL을 HTMLImageElement로 먼저 로드한 후 텍스처 생성
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          img.onload = () => {
            try {
              
              // 이미지가 완전히 로드되었는지 확인
              if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
                throw new Error('Image not fully loaded')
              }
              
              const texture = PIXI.Texture.from(img)
              
              if (!texture) {
                throw new Error('PIXI.Texture.from returned undefined')
              }
              
              if (!texture.baseTexture) {
                throw new Error('Texture baseTexture is undefined')
              }
              
              // 이미지가 완전히 로드되었으므로 텍스처도 즉시 사용 가능해야 함
              // baseTexture를 강제로 업데이트하고 유효성 확인
              texture.baseTexture.update()
              
              // 이미지가 로드되었으므로 텍스처도 즉시 resolve
              // baseTexture.valid가 false여도 이미지가 로드되었으므로 사용 가능
              textureCache.set(url, texture)
              URL.revokeObjectURL(blobUrl)
              resolve(texture)
            } catch (textureError) {
              console.error(`[Texture] PIXI.Texture.from 실패:`, textureError)
              URL.revokeObjectURL(blobUrl)
              // 쿠팡 이미지인 경우 placeholder 반환
              if (isCoupangImage) {
                createPlaceholderTexture()
              } else {
                tryDirectLoad(true)
              }
            }
          }
          
          img.onerror = (e) => {
            console.error(`[Texture] HTMLImageElement 로드 실패:`, e)
            URL.revokeObjectURL(blobUrl)
            // 쿠팡 이미지인 경우 placeholder 반환
            if (isCoupangImage) {
              createPlaceholderTexture()
            } else {
              tryDirectLoad(true)
            }
          }
          
          img.src = blobUrl
        })
        .catch((error) => {
          console.error(`[Texture] 프록시 로드 실패, 직접 로드 시도: ${url.substring(0, 50)}...`, error)
          // 쿠팡 이미지인 경우 placeholder 반환
          if (isCoupangImage) {
            createPlaceholderTexture()
          } else {
            // 프록시 실패 시 직접 로드 시도
            tryDirectLoad(true)
          }
        })
    } else {
      tryDirectLoad(false)
    }
    
    function tryDirectLoad(isCoupangFallback: boolean) {
      // PIXI.Assets.load는 옵션을 객체 형태로 전달해야 함
      const assetConfig = isCoupangImage 
        ? { src: url, crossOrigin: 'anonymous' }
        : url
      
      PIXI.Assets.load(assetConfig)
        .then((texture) => {
          if (texture) {
            textureCache.set(url, texture)
            resolve(texture)
          } else {
            // 텍스처가 없으면 placeholder 반환 (모든 경우)
            console.warn(`[Texture] PIXI.Assets.load가 null을 반환, placeholder 사용: ${url.substring(0, 50)}...`)
            return createPlaceholderTexture()
          }
        })
        .catch((error) => {
          console.warn(`[Texture] PIXI.Assets.load 실패, HTMLImageElement fallback 시도: ${url.substring(0, 50)}...`, error)
          
          // 쿠팡 이미지의 경우 프록시를 다시 시도하거나 placeholder 사용
          if (isCoupangFallback || isCoupangImage) {
            // 에러 로그는 한 번만 출력 (너무 많은 로그 방지)
            if (isCoupangFallback) {
              console.warn(`[Texture] 쿠팡 이미지 로드 실패, placeholder 사용: ${url.substring(0, 50)}...`)
            }
            createPlaceholderTexture()
            return
          }
          
          try {
            // fallback: HTMLImageElement를 통해 로드 후 텍스처 생성
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            img.onload = () => {
              try {
                const fallbackTexture = PIXI.Texture.from(img)
                if (fallbackTexture) {
                  textureCache.set(url, fallbackTexture)
                  resolve(fallbackTexture)
                } else {
                  reject(new Error(`Failed to create texture from image: ${url.substring(0, 50)}...`))
                }
              } catch (textureError) {
                reject(new Error(`Failed to create texture: ${url.substring(0, 50)}...`))
              }
            }
            
            img.onerror = (e) => {
              console.error(`[Texture] HTMLImageElement 로드 실패: ${url.substring(0, 50)}...`)
              reject(new Error(`Failed to load image: ${url.substring(0, 50)}... (CORS or invalid URL)`))
            }
            
            img.src = url
          } catch (fallbackError) {
            // 쿠팡 이미지인 경우 placeholder 반환
            if (isCoupangImage) {
              createPlaceholderTexture()
            } else {
              reject(new Error(`Failed to load texture: ${url.substring(0, 50)}... (may be from different platform)`))
            }
          }
        })
    }
    
    function createPlaceholderTexture() {
      try {
        // 1x1 투명 픽셀 텍스처 생성
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, 1, 1)
        }
        const placeholderTexture = PIXI.Texture.from(canvas)
        textureCache.set(url, placeholderTexture)
        console.warn(`[Texture] Placeholder 텍스처 반환: ${url.substring(0, 50)}...`)
        resolve(placeholderTexture)
      } catch (placeholderError) {
        console.error(`[Texture] Placeholder 생성 실패:`, placeholderError)
        // 최후의 수단: 빈 텍스처 반환
        const emptyTexture = PIXI.Texture.EMPTY
        textureCache.set(url, emptyTexture)
        resolve(emptyTexture)
      }
    }
  })
}

