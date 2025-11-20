// Product 타입 변환 유틸리티

import type { ProductResponse } from '@/lib/types/api/product'
import type { Product, Platform } from '@/store/useVideoCreateStore'

/**
 * API ProductResponse를 앱 내부 Product 타입으로 변환
 */
export function transformProductResponseToProduct(
  productResponse: ProductResponse,
  platform: Platform = 'coupang'
): Product {
  // images 배열의 첫 번째 이미지 URL 사용, 없으면 placeholder
  const imageUrl = productResponse.images?.[0]?.url || 'https://via.placeholder.com/200'
  
  // shoppingMall을 platform으로 변환 (현재는 COUPANG만 지원)
  const productPlatform: Platform = 
    productResponse.shoppingMall === 'COUPANG' ? 'coupang' : 'coupang'

  return {
    id: productResponse.id,
    name: productResponse.name,
    price: productResponse.price || 0,
    image: imageUrl,
    platform: productPlatform,
    url: `https://www.coupang.com/vp/products/${productResponse.id}`, // 임시 URL
    description: productResponse.description,
  }
}

