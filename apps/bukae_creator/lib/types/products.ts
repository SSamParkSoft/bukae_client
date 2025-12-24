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
  name?: string // API에서 오지 않을 수 있음
  title?: string // 실제 API 필드명
  price?: number // API에서 오지 않을 수 있음
  originalPrice?: number // 실제 API 필드명
  salePrice?: number // 실제 API 필드명
  image?: string
  thumbnailUrl?: string // 실제 API 필드명
  url?: string // API에서 오지 않을 수 있음
  productUrl?: string
  affiliateLink?: string // 실제 API 필드명
  description?: string
  platform?: string
  mallName?: string // 실제 API 필드명 (AliExpress, Coupang, Amazon 등)
  currency?: string // 실제 API 필드명
  rating?: number
  // 추가 필드가 있을 수 있음
  [key: string]: unknown
}

// 내부에서 사용하는 Product 타입 (useVideoCreateStore의 Product와 호환)
import type { Product, Platform } from '@/store/useVideoCreateStore'
import { convertToKRW } from '@/lib/utils/currency'

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

  // 이름 처리: title 또는 name 사용 (API는 title을 사용)
  const name = productResponse.title || productResponse.name || ''

  // 가격 처리: salePrice 또는 originalPrice 사용 (API는 salePrice/originalPrice를 사용)
  // 통화 변환: 플랫폼별로 강제 통화 설정 (API의 currency 필드를 신뢰하지 않음)
  const rawPrice = productResponse.salePrice ?? productResponse.originalPrice ?? productResponse.price ?? 0
  
  // 플랫폼별 강제 통화 설정
  // 주의: API가 잘못된 currency를 보낼 수 있으므로, 플랫폼별로 강제로 설정
  const forcedCurrencyMap: Record<TargetMall, string> = {
    ALI_EXPRESS: 'CNY', // 알리익스프레스는 무조건 위안화 (API가 KRW로 보내도 무시)
    COUPANG: 'KRW', // 쿠팡은 원화
    AMAZON: 'USD', // 아마존은 달러
  }
  
  // AliExpress의 경우 API의 currency 필드를 무시하고 무조건 CNY 사용
  const currency = forcedCurrencyMap[targetMall] || 'KRW'
  
  // 디버깅: 변환 전 원본 데이터 로그
  console.log('[ProductResponse] 가격 변환 전:', {
    salePrice: productResponse.salePrice,
    originalPrice: productResponse.originalPrice,
    price: productResponse.price,
    apiCurrency: productResponse.currency, // API에서 보낸 currency (신뢰하지 않음)
    targetMall,
    forcedCurrency: currency, // 실제로 사용하는 통화 (플랫폼별 강제)
    rawPrice,
  })
  
  const price = convertToKRW(rawPrice, currency)
  
  // 디버깅: 변환 후 결과 로그
  console.log('[ProductResponse] 가격 변환 후:', {
    rawPrice,
    currency,
    convertedPrice: price,
  })

  // 이미지 처리: thumbnailUrl 또는 image 사용 (API는 thumbnailUrl을 사용)
  const image = productResponse.thumbnailUrl || productResponse.image || ''

  // URL 처리: affiliateLink 또는 productUrl 또는 url 사용 (API는 affiliateLink를 사용)
  const url = productResponse.affiliateLink || productResponse.productUrl || productResponse.url || ''

  return {
    id,
    name,
    price,
    image,
    platform,
    url,
    description: productResponse.description,
  }
}

