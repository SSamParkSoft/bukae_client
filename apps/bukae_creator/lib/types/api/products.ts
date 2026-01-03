/**
 * Product API DTO (Data Transfer Object) 정의
 * 
 * 이 파일의 타입들은 백엔드 API와의 통신을 위한 DTO입니다.
 * 내부 도메인 로직에서는 사용하지 않고, 반드시 변환 함수를 통해
 * 도메인 모델로 변환하여 사용해야 합니다.
 * 
 * @see lib/types/domain/product.ts - Product 도메인 모델
 * @see lib/utils/converters/product.ts - 변환 함수
 */

/**
 * 쇼핑몰 타입 (API 형식)
 */
export type TargetMall = 'ALI_EXPRESS' | 'COUPANG' | 'AMAZON'

/**
 * 상품 검색 API 요청 타입
 */
export interface ProductSearchRequest {
  query: string
  targetMall: TargetMall | null // 'all' 선택 시 null
  userTrackingId: string | null
}

/**
 * 상품 검색 API 응답 타입
 * 동기 응답 - 상품 리스트 직접 반환
 */
export type ProductSearchResponse = ProductResponse[]

/**
 * 상품 정보 API 응답 DTO
 * 
 * @note API에서 다양한 필드명을 사용하므로 optional로 정의
 * @note 변환 함수를 통해 도메인 모델로 변환하여 사용해야 합니다
 * @see convertProductResponseToProduct - 변환 함수
 */
export interface ProductResponse {
  id?: string
  productId?: string | number
  name?: string // API에서 오지 않을 수 있음
  title?: string // 실제 API 필드명
  productTitle?: string // 새로운 API 필드명 (title과 동일)
  price?: number // API에서 오지 않을 수 있음
  originalPrice?: number // 실제 API 필드명
  salePrice?: number // 실제 API 필드명
  image?: string
  thumbnailUrl?: string // 실제 API 필드명
  productMainImageUrl?: string // 새로운 API 필드명 (thumbnailUrl과 동일)
  imageURL?: string | string[] // 이미지 URL (단일 또는 배열)
  url?: string // API에서 오지 않을 수 있음
  productUrl?: string
  affiliateLink?: string // 실제 API 필드명
  detailUrl?: string // 새로운 API 필드명
  description?: string
  platform?: string
  mallName?: string // 실제 API 필드명 (AliExpress, Coupang, Amazon 등)
  shopName?: string // 새로운 API 필드명
  currency?: string // 실제 API 필드명
  discount?: string // 새로운 API 필드명 (할인율)
  discountRate?: string // 새로운 API 필드명
  commissionRate?: string // 수수료율
  rating?: number
  evaluateRate?: number // 새로운 API 필드명 (rating과 동일)
  salesVolume?: number // 새로운 API 필드명
  lastestVolume?: number // 새로운 API 필드명 (salesVolume과 동일)
  // 추가 필드가 있을 수 있음
  [key: string]: unknown
}

