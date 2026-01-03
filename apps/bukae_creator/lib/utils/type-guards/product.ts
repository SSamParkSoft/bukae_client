/**
 * Product 관련 타입 가드
 */

import type { ProductResponse } from '@/lib/types/api/products'
import type { Product } from '@/lib/types/domain/product'
import { isObject, isString, isNumber, isNonEmptyString } from './common'

/**
 * ProductResponse 타입 가드
 * 런타임에서 ProductResponse인지 검증합니다.
 */
export function isProductResponse(value: unknown): value is ProductResponse {
  if (!isObject(value)) return false

  // 최소한 id 또는 productId가 있어야 함
  const hasId = isString(value.id) || isNumber(value.productId) || isString(value.productId)

  // 최소한 하나의 이름 필드가 있어야 함
  const hasName =
    isString(value.name) ||
    isString(value.title) ||
    isString(value.productTitle)

  return hasId && hasName
}

/**
 * Product 타입 가드
 * 런타임에서 Product인지 검증합니다.
 */
export function isProduct(value: unknown): value is Product {
  if (!isObject(value)) return false

  return (
    isString(value.id) &&
    isNonEmptyString(value.name) &&
    isNumber(value.price) &&
    isString(value.image) &&
    isString(value.platform) &&
    isString(value.url) &&
    (value.description === undefined || isString(value.description))
  )
}

/**
 * Product 배열 타입 가드
 */
export function isProductArray(value: unknown): value is Product[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => isProduct(item))
}

/**
 * ProductResponse 배열 타입 가드
 */
export function isProductResponseArray(value: unknown): value is ProductResponse[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => isProductResponse(item))
}

