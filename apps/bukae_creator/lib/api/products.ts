/**
 * 상품 검색 API 클라이언트
 */

import { api } from './client'
import type {
  ProductSearchRequest,
  ProductSearchResponse,
} from '@/lib/types/api/products'
import { isProductResponseArray } from '@/lib/utils/type-guards/product'

/**
 * 상품 검색 API 호출 (동기 응답)
 * 
 * @param request 검색 요청 (query, targetMall, userTrackingId)
 * @returns 상품 리스트 (ProductResponse[])
 * @throws {Error} API 응답이 유효하지 않은 경우
 */
export async function searchProducts(
  request: ProductSearchRequest
): Promise<ProductSearchResponse> {
  // 타임아웃 60초 설정 (API 문서 권장사항)
  const response = await api.post<ProductSearchResponse>(
    '/api/v1/products/search',
    request,
    {
      timeout: 60000,
    }
  )

  // 타입 가드로 런타임 검증
  if (!isProductResponseArray(response)) {
    throw new Error('API 응답이 유효한 ProductResponse 배열이 아닙니다.')
  }

  return response
}

