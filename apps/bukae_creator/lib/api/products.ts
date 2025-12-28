// 상품 검색 API 클라이언트

import { api } from './client'
import type {
  ProductSearchRequest,
  ProductSearchResponse,
} from '@/lib/types/products'

/**
 * 상품 검색 API 호출 (동기 응답)
 * @param request 검색 요청 (query, targetMall, userTrackingId)
 * @returns 상품 리스트 (ProductResponse[])
 */
export async function searchProducts(
  request: ProductSearchRequest
): Promise<ProductSearchResponse> {
  // 타임아웃 60초 설정 (API 문서 권장사항)
  return api.post<ProductSearchResponse>('/api/v1/products/search', request, {
    timeout: 60000,
  })
}

