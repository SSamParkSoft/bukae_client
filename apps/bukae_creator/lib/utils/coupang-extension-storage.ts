/**
 * 쿠팡 확장프로그램의 Extension Storage에서 이미지를 읽어오는 유틸리티
 * 확장프로그램에 메시지를 보내서 storage 데이터를 요청합니다.
 */

export interface CoupangExtensionStorageData {
  products: Record<string, {
    productId: string
    price: string
    description: string
  }>
  productimages: Record<string, string>
  productDetaillmages: Record<string, string[]>
  lastUpdated: number
}

/**
 * 확장프로그램에 storage 데이터 요청 메시지 전송
 */
/**
 * Extension Storage 접근 가능 여부 테스트
 */
export function testExtensionStorageAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    // 테스트 메시지 전송
    window.postMessage(
      {
        type: 'REQUEST_COUPANG_STORAGE',
        source: 'bukae-webapp',
        timestamp: Date.now(),
      },
      '*'
    )

    let responded = false
    const timeout = setTimeout(() => {
      if (!responded) {
        window.removeEventListener('message', testHandler)
        resolve(false)
      }
    }, 3000)

    const testHandler = (event: MessageEvent) => {
      const storageData = extractStorageDataFromEvent(event)
      
      if (storageData) {
        responded = true
        clearTimeout(timeout)
        window.removeEventListener('message', testHandler)
        resolve(true)
      }
    }

    window.addEventListener('message', testHandler)
  })
}

/**
 * 메시지 이벤트에서 Storage 데이터를 추출하는 헬퍼 함수
 */
function extractStorageDataFromEvent(event: MessageEvent): CoupangExtensionStorageData | null {
  // 정확한 응답 형식 확인
  if (
    event.data?.type === 'COUPANG_STORAGE_RESPONSE' &&
    event.data?.source === 'coupang-product-extractor'
  ) {
    return event.data.data as CoupangExtensionStorageData
  }
  
  // 다른 형식의 storage 데이터도 확인 (products, productimages, productDetaillmages 키가 있으면)
  if (event.data?.products || event.data?.productimages || event.data?.productDetaillmages || event.data?.productDetailImages) {
    return {
      products: event.data.products || {},
      productimages: event.data.productimages || {},
      productDetaillmages: event.data.productDetaillmages || event.data.productDetailImages || {},
      lastUpdated: event.data.lastUpdated || Date.now()
    }
  }
  
  return null
}

export function requestCoupangExtensionStorage(): Promise<CoupangExtensionStorageData | null> {
  return new Promise((resolve) => {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.log('[Extension Storage] 요청 메시지 전송')
    }
    
    // 확장프로그램에 메시지 전송
    window.postMessage(
      {
        type: 'REQUEST_COUPANG_STORAGE',
        source: 'bukae-webapp',
        timestamp: Date.now(),
      },
      '*'
    )

    // 응답 대기 (최대 5초)
    const timeout = setTimeout(() => {
      if (isDev) {
        console.log('[Extension Storage] 응답 타임아웃')
      }
      window.removeEventListener('message', messageHandler)
      resolve(null)
    }, 5000)

    const messageHandler = (event: MessageEvent) => {
      const storageData = extractStorageDataFromEvent(event)
      
      if (storageData) {
        if (isDev) {
          console.log('[Extension Storage] Storage 데이터 수신:', {
            hasData: !!storageData,
            products: Object.keys(storageData.products || {}).length,
            productimages: Object.keys(storageData.productimages || {}).length,
            productDetaillmages: Object.keys(storageData.productDetaillmages || {}).length,
          })
        }
        clearTimeout(timeout)
        window.removeEventListener('message', messageHandler)
        resolve(storageData)
      }
    }

    window.addEventListener('message', messageHandler)
  })
}

/**
 * 이미지가 실제 상품 이미지인지 확인 (쿠팡 로고 등 불필요한 이미지 제외)
 */
function isValidProductImage(url: string): boolean {
  if (!url) return false
  
  // 쿠팡 썸네일 이미지만 허용 (thumbnail.coupangcdn.com)
  if (!url.includes('thumbnail.coupangcdn.com')) {
    return false
  }
  
  // 쿠팡 로고나 불필요한 이미지 제외
  const excludedPatterns = [
    'logo_coupang',
    'logo-coupang',
    'common/logo',
    'image7.coupangcdn.com', // 로고 이미지 서버
    '/icon',
    '/icons',
    '.svg',
    '.ico',
  ]
  
  return !excludedPatterns.some(pattern => url.includes(pattern))
}

/**
 * 모든 이미지 소스에서 유효한 이미지를 수집하는 헬퍼 함수
 */
function collectValidImages(
  imageSources: (string | string[])[],
  seenImages: Set<string>
): void {
  for (const source of imageSources) {
    if (!source) continue
    
    const urls = Array.isArray(source) ? source : [source]
    for (const url of urls) {
      if (url && typeof url === 'string' && isValidProductImage(url) && !seenImages.has(url)) {
        seenImages.add(url)
      }
    }
  }
}

/**
 * Extension Storage 데이터에서 이미지 URL 배열 추출
 */
export function extractImagesFromStorage(
  storageData: CoupangExtensionStorageData,
  productId?: string
): string[] {
  const seenImages = new Set<string>()
  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    console.log('[Extension Storage] 이미지 추출 시작:', { productId })
  }

  // productDetailImages 키 이름 확인 (오타 가능성 - productDetaillmages vs productDetailImages)
  const detailImages = storageData.productDetaillmages || 
    (storageData as CoupangExtensionStorageData & { productDetailImages?: Record<string, string[]> }).productDetailImages || 
    {}
  
  // productId가 제공된 경우 해당 상품의 이미지만 추출
  if (productId) {
    if (isDev) {
      console.log('[Extension Storage] productId로 이미지 찾기:', productId)
    }
    
    // 대표 이미지
    const mainImage = storageData.productimages?.[productId]
    if (mainImage && isValidProductImage(mainImage)) {
      seenImages.add(mainImage)
    }
    
    // 상세 이미지들
    const productDetailImages = detailImages[productId]
    if (productDetailImages && Array.isArray(productDetailImages)) {
      collectValidImages(productDetailImages, seenImages)
    }
    
    // productId로 매칭이 안 되면 모든 이미지 가져오기 (fallback)
    if (seenImages.size === 0) {
      if (isDev) {
        console.log('[Extension Storage] productId 매칭 실패, 모든 이미지 가져오기')
      }
      collectValidImages(Object.values(storageData.productimages || {}), seenImages)
      collectValidImages(Object.values(detailImages), seenImages)
    }
  } else {
    // productId가 없으면 모든 상품의 이미지 추출
    collectValidImages(Object.values(storageData.productimages || {}), seenImages)
    collectValidImages(Object.values(detailImages), seenImages)
  }

  const images = Array.from(seenImages)
  if (isDev) {
    console.log('[Extension Storage] 추출된 이미지:', images.length, '개')
  }
  return images
}

