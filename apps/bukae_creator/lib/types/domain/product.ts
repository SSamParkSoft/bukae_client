/**
 * Product 도메인 모델
 * 내부 애플리케이션에서 사용하는 Product 타입입니다.
 * API 응답과는 분리되어 있습니다.
 */

/**
 * 플랫폼 타입
 */
export type Platform = 'coupang' | 'naver' | 'aliexpress' | 'amazon'

/**
 * Product 도메인 모델
 * 
 * @note API 응답(ProductResponse)과는 별개의 타입입니다.
 * @note 변환 함수를 통해 ProductResponse에서 생성해야 합니다.
 */
export interface Product {
  /** 상품 고유 ID */
  id: string
  /** 상품명 */
  name: string
  /** 가격 */
  price: number
  /** 대표 이미지 URL (메인 이미지) */
  image: string
  /** 모든 이미지 URL 배열 (상세 이미지 포함) */
  images: string[]
  /** 플랫폼 */
  platform: Platform
  /** 상품 URL */
  url: string
  /** 상품 설명 (선택) */
  description?: string
}

/**
 * Product 생성 옵션
 */
export interface CreateProductOptions {
  /** 기본값 설정 */
  defaults?: Partial<Product>
  /** 검증 옵션 */
  validate?: boolean
}

