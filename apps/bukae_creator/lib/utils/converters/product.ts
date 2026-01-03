/**
 * Product 변환 함수
 * ProductResponse (API DTO)를 Product (도메인 모델)로 변환합니다.
 */

import type { Product, Platform } from '@/lib/types/domain/product'
import type { ProductResponse, TargetMall } from '@/lib/types/api/products'
import type { ConverterFunction, ConverterOptions } from './types'

/**
 * TargetMall을 Platform으로 변환
 */
const PLATFORM_MAP: Record<TargetMall, Platform> = {
  ALI_EXPRESS: 'aliexpress',
  COUPANG: 'coupang',
  AMAZON: 'amazon',
}


/**
 * ProductResponse를 Product로 변환 (하위 호환성)
 * 기존 함수 시그니처를 유지합니다.
 * 
 * @param productResponse - API 응답 데이터
 * @param targetMall - 쇼핑몰 타입
 * @returns 변환된 Product 도메인 모델
 */
export function convertProductResponseToProduct(
  productResponse: ProductResponse,
  targetMall: TargetMall
): Product {
  return convertProductResponseToProductInternal(productResponse, {
    context: { targetMall },
  })
}

/**
 * 내부 변환 함수 (옵션 기반)
 */
const convertProductResponseToProductInternal: ConverterFunction<
  ProductResponse,
  Product
> = (productResponse, options) => {
  const { strict = false, context } = options || {}
  const targetMall = (context?.targetMall as TargetMall) || 'ALI_EXPRESS'

  // platform 매핑
  const platform = PLATFORM_MAP[targetMall] || 'aliexpress'

  // ID 처리: id 또는 productId 사용
  const id = productResponse.id || String(productResponse.productId || '')

  if (strict && !id) {
    throw new Error('ProductResponse에 id 또는 productId가 없습니다.')
  }

  // 이름 처리: productTitle, title, name 순서로 확인
  const name =
    productResponse.productTitle ||
    productResponse.title ||
    productResponse.name ||
    ''

  if (strict && !name) {
    throw new Error('ProductResponse에 이름 정보가 없습니다.')
  }

  // 가격 처리: salePrice 우선, 없으면 originalPrice, 없으면 price
  const price =
    productResponse.salePrice ??
    productResponse.originalPrice ??
    productResponse.price ??
    0

  if (strict && price === 0) {
    throw new Error('ProductResponse에 가격 정보가 없습니다.')
  }

  // 대표 이미지 처리: productMainImageUrl, thumbnailUrl, image 순서로 확인
  const image =
    productResponse.productMainImageUrl ||
    productResponse.thumbnailUrl ||
    productResponse.image ||
    ''

  if (strict && !image) {
    throw new Error('ProductResponse에 이미지 정보가 없습니다.')
  }

  // 모든 이미지 URL 수집
  const images: string[] = []
  
  // imageURL 필드 처리 (배열 또는 문자열)
  if (productResponse.imageURL) {
    if (Array.isArray(productResponse.imageURL)) {
      images.push(...productResponse.imageURL.filter(Boolean))
    } else if (typeof productResponse.imageURL === 'string') {
      images.push(productResponse.imageURL)
    }
  }
  
  // 다른 가능한 이미지 필드들 확인
  const possibleImageFields = [
    'imageUrls',
    'image_url',
    'image_urls',
    'images',
    'productImages',
    'product_images',
  ]
  
  for (const field of possibleImageFields) {
    const value = (productResponse as Record<string, unknown>)[field]
    if (value) {
      if (Array.isArray(value)) {
        images.push(...value.filter((v): v is string => typeof v === 'string' && Boolean(v)))
      } else if (typeof value === 'string') {
        images.push(value)
      }
    }
  }
  
  // 대표 이미지가 images에 없으면 추가
  if (image && !images.includes(image)) {
    images.unshift(image) // 맨 앞에 추가
  }
  
  // 중복 제거
  const uniqueImages = Array.from(new Set(images))

  // URL 처리: affiliateLink, detailUrl, productUrl, url 순서로 확인
  const url =
    productResponse.affiliateLink ||
    productResponse.detailUrl ||
    productResponse.productUrl ||
    productResponse.url ||
    ''

  if (strict && !url) {
    throw new Error('ProductResponse에 URL 정보가 없습니다.')
  }

  return {
    id,
    name,
    price,
    image,
    images: uniqueImages,
    platform,
    url,
    description: productResponse.description,
  }
}

