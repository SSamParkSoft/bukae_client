/**
 * Product 도메인 모델을 ProductResponse 형태로 변환하는 헬퍼 함수
 * API 요청 시 사용
 */

import type { Product } from '@/lib/types/domain/product'
import type { ProductResponse } from '@/lib/types/api/products'

/**
 * Product를 ProductResponse 형태로 변환
 * @param product Product 도메인 모델
 * @returns ProductResponse 형태의 객체
 */
export function convertProductToProductResponse(product: Product): ProductResponse {
  // platform을 mallName으로 변환
  const platformToMallName: Record<string, string> = {
    coupang: 'COUPANG',
    naver: 'NAVER',
    aliexpress: 'ALI_EXPRESS',
    amazon: 'AMAZON',
  }

  const mallName = platformToMallName[product.platform] || 'ALI_EXPRESS'
  const mallType = mallName

  return {
    id: product.id,
    productId: product.id,
    title: product.name,
    productTitle: product.name,
    name: product.name,
    salePrice: product.price,
    originalPrice: product.price,
    price: product.price,
    thumbnailUrl: product.image,
    productMainImageUrl: product.image,
    image: product.image,
    imageURL: product.images,
    imageUrls: product.images,
    detailUrl: product.url,
    productUrl: product.url,
    url: product.url,
    affiliateLink: product.url,
    description: product.description,
    platform: product.platform,
    mallName,
    mallType,
    shopName: '',
    shopUrl: '',
    currency: 'KRW',
    discountRate: '',
    commissionRate: '',
    rating: undefined,
    evaluateRate: undefined,
    salesVolume: undefined,
    lastestVolume: undefined,
    categoryPath: '',
    promotionUrl: product.url,
  }
}
