// 상품 검색 API 클라이언트

import { api } from './client'
import type {
  ProductSearchRequest,
  ProductSearchResponse,
} from '@/lib/types/products'

/**
 * 상품 검색 API 호출
 * @param request 검색 요청 (query, targetMall, userTrackingId)
 * @returns correlationId와 status를 포함한 응답
 */
export async function searchProducts(
  request: ProductSearchRequest
): Promise<ProductSearchResponse> {
  return api.post<ProductSearchResponse>('/api/v1/products/search', request)
}

