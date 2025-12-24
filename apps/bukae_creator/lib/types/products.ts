// 상품 검색 관련 타입 정의

export type TargetMall = 'ALI_EXPRESS' | 'COUPANG' | 'AMAZON'

// API 요청 타입
export interface ProductSearchRequest {
  query: string
  targetMall: TargetMall | null // 'all' 선택 시 null
  userTrackingId: string | null
}

// API 응답 타입 (초기 응답)
export interface ProductSearchResponse {
  correlationId: string
  status: 'ACCEPTED'
}

// API 응답 타입 (WebSocket을 통해 받는 상품 정보)
export interface ProductResponse {
  id?: string
  productId?: string | number
  name: string
  price: number
  image?: string
  thumbnailUrl?: string
  url?: string
  productUrl?: string
  description?: string
  platform?: string
  // 추가 필드가 있을 수 있음
  [key: string]: unknown
}

// 내부에서 사용하는 Product 타입 (useVideoCreateStore의 Product와 호환)
import type { Product, Platform } from '@/store/useVideoCreateStore'

/**
 * API 응답의 ProductResponse를 내부 Product 타입으로 변환
 */
export function convertProductResponseToProduct(
  productResponse: ProductResponse,
  targetMall: TargetMall
): Product {
  // platform 매핑 (API 형식 -> 내부 형식)
  const platformMap: Record<TargetMall, Platform> = {
    ALI_EXPRESS: 'aliexpress',
    COUPANG: 'coupang',
    AMAZON: 'amazon',
  }

  const platform = platformMap[targetMall] || 'aliexpress'

  // ID 처리: id 또는 productId 사용
  const id = productResponse.id || String(productResponse.productId || '')

  // 이미지 처리: image 또는 thumbnailUrl 사용
  const image = productResponse.image || productResponse.thumbnailUrl || ''

  // URL 처리: url 또는 productUrl 사용
  const url = productResponse.url || productResponse.productUrl || ''

  return {
    id,
    name: productResponse.name || '',
    price: productResponse.price ?? 0, // price가 없으면 0으로 설정
    image,
    platform,
    url,
    description: productResponse.description,
  }
}

