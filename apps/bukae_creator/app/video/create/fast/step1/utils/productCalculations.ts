import type { ProductResponse } from '@/lib/types/api/products'
import type { Product } from '@/lib/types/domain/product'

export interface ProductPriceInfo {
  originalPrice?: number
  salePrice: number
  displayDiscount?: string
  commissionRate?: string
  currency: string
  expectedRevenue: number | null
}

/**
 * 상품 가격 정보 계산
 */
export function calculateProductPriceInfo(
  product: Product,
  productResponse?: ProductResponse
): ProductPriceInfo {
  const originalPrice = productResponse?.originalPrice
  const salePrice = productResponse?.salePrice || product.price
  const discountRate = productResponse?.discountRate || productResponse?.discount
  const commissionRate = productResponse?.commissionRate
  const currency = productResponse?.currency || 'KRW'

  // 할인율 계산
  let calculatedDiscount: string | undefined
  if (originalPrice && salePrice && originalPrice > salePrice) {
    const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    calculatedDiscount = `${discountPercent}%`
  }
  const displayDiscount = discountRate || calculatedDiscount

  // 예상 수익 계산
  let expectedRevenue: number | null = null
  if (salePrice && commissionRate) {
    const rateStr = String(commissionRate).replace(/%/g, '').trim()
    const rateNum = parseFloat(rateStr)
    if (!isNaN(rateNum)) {
      expectedRevenue = salePrice * (rateNum / 100)
    }
  }

  return {
    originalPrice,
    salePrice,
    displayDiscount,
    commissionRate,
    currency,
    expectedRevenue,
  }
}

/**
 * 플랫폼 이름 변환
 */
export function getPlatformName(platform: Product['platform']): string {
  switch (platform) {
    case 'coupang':
      return '쿠팡'
    case 'naver':
      return '네이버'
    case 'aliexpress':
      return '알리익스프레스'
    case 'amazon':
      return '아마존'
    default:
      return '알 수 없음'
  }
}
